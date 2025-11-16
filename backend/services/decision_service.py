from typing import Dict, List, Tuple
import math


GRADE_GROUPS = {
    "group1": ["PR", "MC", "V"],
    "MA": ["MA"],
    "AS": ["AS"],
    "group3": ["AC", "PES", "PTC"],
}


def compute_total_required(planning: List[Dict], default_min_per_room: int = 1) -> int:
    """Calcule le nombre total de surveillances requis à partir du planning.

    planning: liste de créneaux, chaque créneau est dict {
        "date": str (optionnel),
        "rooms": [ {"min_supervisors": int}, ... ]
    }
    Si une salle n'indique pas min_supervisors, on utilise default_min_per_room.
    """
    total = 0
    for slot in planning:
        rooms = slot.get("rooms", [])
        for r in rooms:
            m = r.get("min_supervisors")
            if m is None:
                m = default_min_per_room
            total += int(m)
    return total


def _all_counts(counts_per_grade: Dict[str, int]) -> Dict[str, int]:
    # Ensure all grades present with zero default
    grades = [g for grp in GRADE_GROUPS.values() for g in grp]
    res = {g: int(counts_per_grade.get(g, 0)) for g in grades}
    return res


def estimate_quotas(
    counts_per_grade: Dict[str, int],
    planning: List[Dict],
    default_min_per_room: int = 1,
    absence_majoration_pct: float = 10.0,
    min_diff_PR_MA: int = 3,
    max_quota_per_teacher: int = 10,
) -> Dict:
    """Estime les quotas de surveillances par enseignant selon les grades.

    Retourne un dict contenant :
    - quotas_par_teacher (dict grade->int)
    - assignments_total_par_grade (dict grade->int)
    - total_required (int)
    - total_capacity (int)
    - slack (int)
    - allowed_non_wish_per_teacher (int)
    - debug: details
    """
    counts = _all_counts(counts_per_grade)

    total_required_raw = compute_total_required(planning, default_min_per_room)
    total_required = math.ceil(total_required_raw * (1 + absence_majoration_pct / 100.0))

    # totals per group
    n_group1 = sum(counts[g] for g in GRADE_GROUPS["group1"])  # PR/MC/V
    n_MA = counts.get("MA", 0)
    n_AS = counts.get("AS", 0)
    n_group3 = sum(counts[g] for g in GRADE_GROUPS["group3"])  # AC/PES/PTC

    total_teachers = n_group1 + n_MA + n_AS + n_group3
    if total_teachers == 0:
        raise ValueError("Aucun enseignant mobilisable fourni (total_teachers == 0)")

    best = None
    best_slack = None

    # Brute-force sur petites plages raisonnables
    for q1 in range(0, max_quota_per_teacher + 1):
        # q2 must be >= q1 + min_diff_PR_MA
        for q2 in range(q1 + min_diff_PR_MA, max_quota_per_teacher + 1):
            for q3 in range(q2, max_quota_per_teacher + 1):
                for q4 in range(q3, max_quota_per_teacher + 1):
                    capacity = (
                        q1 * n_group1 + q2 * n_MA + q3 * n_AS + q4 * n_group3
                    )
                    if capacity >= total_required:
                        slack = capacity - total_required
                        if best is None or slack < best_slack or (slack == best_slack and q1 < best[0]):
                            best = (q1, q2, q3, q4)
                            best_slack = slack
    if best is None:
        # Aucun résultat dans les bornes, proposer une augmentation de max_quota_per_teacher
        raise ValueError("Aucun quota trouvé: augmenter max_quota_per_teacher ou revoir les paramètres")

    q1, q2, q3, q4 = best

    quotas_per_teacher = {}
    for g in GRADE_GROUPS["group1"]:
        quotas_per_teacher[g] = q1
    quotas_per_teacher["MA"] = q2
    quotas_per_teacher["AS"] = q3
    for g in GRADE_GROUPS["group3"]:
        quotas_per_teacher[g] = q4

    assignments_total = {g: quotas_per_teacher[g] * counts[g] for g in quotas_per_teacher}
    total_capacity = sum(assignments_total.values())
    slack = total_capacity - total_required

    allowed_non_wish_per_teacher = slack // total_teachers if total_teachers > 0 else 0
    allowed_non_wish_total_by_grade = {g: allowed_non_wish_per_teacher * counts[g] for g in counts}

    return {
        "quotas_per_teacher": quotas_per_teacher,
        "assignments_total_per_grade": assignments_total,
        "total_required": total_required,
        "total_capacity": total_capacity,
        "slack": slack,
        "allowed_non_wish_per_teacher": allowed_non_wish_per_teacher,
        "allowed_non_wish_total_by_grade": allowed_non_wish_total_by_grade,
        "debug": {
            "n_group1": n_group1,
            "n_MA": n_MA,
            "n_AS": n_AS,
            "n_group3": n_group3,
            "total_teachers": total_teachers,
            "best_quota_tuple": best,
            "absence_majoration_pct": absence_majoration_pct,
        },
    }
"""
Service d'aide à la décision pour la planification des surveillances.

Ce module calcule:
1. Le nombre de surveillances nécessaires par grade
2. Le nombre de créneaux de non-souhaits autorisés par grade
3. Les recommandations pour garantir une solution faisable
"""

from sqlalchemy.orm import Session
from models.models import Enseignant, Examen, GradeConfig, Voeu
from config import GRADES
from typing import Dict, List, Tuple
from datetime import datetime, date
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)


class DecisionService:
    """Service pour aider à la prise de décision avant génération du planning"""

    def __init__(self, db: Session):
        self.db = db

    def calculer_recommandations(
        self,
        min_surveillants_par_salle: int = 2,
        majoration_absences: float = 1.1,  # 10% de majoration pour absences
        quota_min_groupe1: int = 4,  # Quota minimal pour PR/MC/V (groupe 1)
        difference_min_pr_ma: int = 1,  # Différence minimale PR/MC/V → MA
        difference_min_ma_as: int = 1,  # Différence minimale MA → AS
        difference_min_as_ac: int = 1,  # Différence minimale AS → AC/PES/PTC
        expert_quota: int = 3,  # Quota fixe pour les experts
    ) -> Dict:
        """
        Calcule les recommandations complètes pour la configuration du planning.

        Args:
            min_surveillants_par_salle: Nombre minimum de surveillants par salle
            majoration_absences: Coefficient de majoration pour tenir compte des absences (1.1 = +10%)
            quota_min_groupe1: Quota minimal pour le groupe 1 (PR/MC/V)
            difference_min_pr_ma: Différence minimale entre PR/MC/V et MA
            difference_min_ma_as: Différence minimale entre MA et AS
            difference_min_as_ac: Différence minimale entre AS et AC/PES/PTC
            expert_quota: Nombre de surveillances pour les experts

        Returns:
            Dict contenant:
            - statistiques_globales: Stats générales (enseignants, examens, etc.)
            - quotas_recommandes: Quotas par grade
            - voeux_autorises: Nombre de créneaux de non-souhaits autorisés par grade
            - faisabilite: Analyse de faisabilité
            - alertes: Liste d'alertes et recommandations
        """
        # 1. Collecter les données de base
        enseignants = self.db.query(Enseignant).filter(
            Enseignant.participe_surveillance == True
        ).all()

        examens = self.db.query(Examen).all()

        # 2. Analyser la répartition des enseignants par grade
        enseignants_par_grade = self._grouper_enseignants_par_grade(enseignants)

        # 3. Calculer le nombre total de surveillances nécessaires
        stats_examens = self._analyser_examens(examens, min_surveillants_par_salle, majoration_absences)

        # 4. Calculer les quotas recommandés par grade
        quotas_recommandes = self._calculer_quotas_par_grade(
            enseignants_par_grade,
            stats_examens["total_surveillances_necessaires"],
            majoration_absences,
            quota_min_groupe1,
            difference_min_pr_ma,
            difference_min_ma_as,
            difference_min_as_ac,
            expert_quota,
        )

        # 5. Calculer les créneaux de non-souhaits autorisés
        voeux_autorises = self._calculer_voeux_autorises(
            enseignants_par_grade,
            stats_examens,
            quotas_recommandes,
        )

        # 6. NOUVELLE VÉRIFICATION: Distribution temporelle
        distribution_temporelle = self._analyser_distribution_temporelle(
            stats_examens["seances_details"],
            enseignants_par_grade,
        )

        # 6.5. NOUVELLE VÉRIFICATION CRITIQUE: Conflit égalité stricte + responsables
        conflit_responsables = self._verifier_conflit_responsables_egalite(
            examens,
            enseignants_par_grade,
            quotas_recommandes,
        )

        # 7. Analyser la faisabilité (inclut déjà vérification nombre_max)
        faisabilite = self._analyser_faisabilite(
            enseignants_par_grade,
            quotas_recommandes,
            stats_examens,
            distribution_temporelle,  # Ajouter ce paramètre
            conflit_responsables,  # Ajouter ce nouveau paramètre
        )

        # 8. Générer les alertes et recommandations
        alertes = self._generer_alertes(
            enseignants_par_grade,
            quotas_recommandes,
            stats_examens,
            faisabilite,
            distribution_temporelle,
            conflit_responsables,  # Ajouter ce nouveau paramètre
        )

        return {
            "statistiques_globales": {
                "nb_total_enseignants": len(enseignants),
                "nb_enseignants_par_grade": {
                    grade: len(ens_list)
                    for grade, ens_list in enseignants_par_grade.items()
                },
                "nb_total_examens": stats_examens["nb_total_examens"],
                "nb_total_salles": stats_examens["nb_total_salles"],
                "nb_total_seances": stats_examens["nb_total_seances"],
                "nb_examens_par_seance_moy": stats_examens["nb_examens_par_seance_moy"],
                "total_surveillances_necessaires": stats_examens[
                    "total_surveillances_necessaires"
                ],
                "total_surveillances_majorees": stats_examens[
                    "total_surveillances_majorees"
                ],
            },
            "quotas_recommandes": quotas_recommandes,
            "voeux_autorises": voeux_autorises,
            "faisabilite": faisabilite,
            "distribution_temporelle": distribution_temporelle,
            "conflit_responsables": conflit_responsables,  # Ajouter cette nouvelle info
            "alertes": alertes,
            "parametres": {
                "min_surveillants_par_salle": min_surveillants_par_salle,
                "majoration_absences": majoration_absences,
                "quota_min_groupe1": quota_min_groupe1,
                "difference_min_pr_ma": difference_min_pr_ma,
                "difference_min_ma_as": difference_min_ma_as,
                "difference_min_as_ac": difference_min_as_ac,
                "expert_quota": expert_quota,
            },
        }

    def _grouper_enseignants_par_grade(
        self, enseignants: List[Enseignant]
    ) -> Dict[str, List[Enseignant]]:
        """Groupe les enseignants par grade"""
        enseignants_par_grade = defaultdict(list)
        for ens in enseignants:
            enseignants_par_grade[ens.grade_code].append(ens)
        return dict(enseignants_par_grade)

    def _analyser_examens(
        self, examens: List[Examen], min_surveillants_par_salle: int, majoration_absences: float = 1.1
    ) -> Dict:
        """Analyse les examens et calcule les besoins en surveillance"""
        if not examens:
            return {
                "nb_total_examens": 0,
                "nb_total_salles": 0,
                "nb_total_seances": 0,
                "nb_examens_par_seance_moy": 0,
                "total_surveillances_necessaires": 0,
                "total_surveillances_majorees": 0,
                "seances_details": [],
            }

        # Grouper par séance (date + heure)
        seances = defaultdict(list)
        for exam in examens:
            seance_key = (exam.dateExam, exam.h_debut, exam.h_fin)
            seances[seance_key].append(exam)

        # Analyser chaque séance
        seances_details = []
        for seance_key, exams_seance in seances.items():
            nb_salles = len(exams_seance)
            nb_surveillants = nb_salles * min_surveillants_par_salle
            seances_details.append(
                {
                    "date": seance_key[0],
                    "h_debut": seance_key[1],
                    "h_fin": seance_key[2],
                    "nb_salles": nb_salles,
                    "nb_surveillants_requis": nb_surveillants,
                }
            )

        nb_total_examens = len(examens)
        nb_total_salles = len(set(exam.cod_salle for exam in examens))
        nb_total_seances = len(seances)
        total_surveillances = sum(s["nb_surveillants_requis"] for s in seances_details)

        return {
            "nb_total_examens": nb_total_examens,
            "nb_total_salles": nb_total_salles,
            "nb_total_seances": nb_total_seances,
            "nb_examens_par_seance_moy": round(nb_total_examens / nb_total_seances, 2)
            if nb_total_seances > 0
            else 0,
            "total_surveillances_necessaires": total_surveillances,
            "total_surveillances_majorees": int(total_surveillances * majoration_absences),  # Utilise le paramètre
            "seances_details": seances_details,
        }

    def _calculer_quotas_par_grade(
        self,
        enseignants_par_grade: Dict[str, List[Enseignant]],
        total_surveillances: int,
        majoration: float,
        quota_min_groupe1: int,
        difference_min_pr_ma: int,
        difference_min_ma_as: int,
        difference_min_as_ac: int,
        expert_quota: int,
    ) -> Dict[str, Dict]:
        """
        Calcule les quotas recommandés par grade selon la hiérarchie:
        
        CONTRAINTES STRICTES (NON MODIFIABLES):
        - PR, MC, V: EXACTEMENT le même quota (le plus bas de la hiérarchie)
        - AC, PES, PTC: EXACTEMENT le même quota (le plus élevé de la hiérarchie)
        
        CONTRAINTES DE DIFFÉRENCE MINIMALE (CONFIGURABLES INDÉPENDAMMENT):
        - Entre PR/MC/V et MA: difference_min_pr_ma
        - Entre MA et AS: difference_min_ma_as
        - Entre AS et AC/PES/PTC: difference_min_as_ac
        
        CONTRAINTE DE DIFFÉRENCE MAXIMALE:
        - Aucune différence entre grades consécutifs ne dépasse 3
        
        Hiérarchie STRICTE des quotas:
        - PR = MC = V (quota le plus bas)
        - MA > PR/MC/V (avec difference_min_pr_ma, max +3)
        - AS > MA (avec difference_min_ma_as, max +3)
        - AC = PES = PTC > AS (avec difference_min_as_ac, max +3)
        - EX: quota fixe indépendant (3 par défaut)
        
        L'utilisateur contrôle chaque différence minimale indépendamment.
        
        Ces contraintes garantissent l'équité au sein de chaque groupe de grades équivalents.
        """
        quotas = {}

        # Ordre hiérarchique des groupes (du plus bas au plus élevé)
        # IMPORTANT: Les grades dans un même groupe ont EXACTEMENT le même quota
        hierarchie_groupes = [
            ["PR", "MC", "V"],  # Groupe 1: Professeurs et équivalents (QUOTA IDENTIQUE OBLIGATOIRE)
            ["MA"],  # Groupe 2: Maîtres Assistants
            ["AS"],  # Groupe 3: Assistants
            ["AC", "PES", "PTC"],  # Groupe 4: Assistants Contractuels et équivalents (QUOTA IDENTIQUE OBLIGATOIRE)
            ["EX"],  # Groupe 5: Experts (quota fixe)
        ]

        # Compter le nombre total d'enseignants (sans les experts)
        nb_total_sans_experts = sum(
            len(ens_list)
            for grade, ens_list in enseignants_par_grade.items()
            if grade != "EX"
        )

        # Compter les experts
        nb_experts = len(enseignants_par_grade.get("EX", []))

        # Calculer le total de surveillances avec majoration
        total_avec_majoration = int(total_surveillances * majoration)

        # Soustraire les surveillances des experts
        total_pour_autres = total_avec_majoration - (nb_experts * expert_quota)

        if nb_total_sans_experts == 0:
            # Cas exceptionnel: que des experts
            return {"EX": {"quota": expert_quota, "total_surveillances": nb_experts * expert_quota}}

        # Calculer le quota de base (pour le groupe le plus bas)
        # On utilise une approche itérative pour respecter les différences minimales
        quotas_calcules = self._calculer_quota_base_optimal(
            enseignants_par_grade,
            hierarchie_groupes,
            total_pour_autres,
            quota_min_groupe1,
            difference_min_pr_ma,
            difference_min_ma_as,
            difference_min_as_ac,
        )

        # Appliquer les quotas selon la hiérarchie
        for i, groupe in enumerate(hierarchie_groupes):
            for grade_code in groupe:
                if grade_code not in enseignants_par_grade:
                    continue

                nb_ens = len(enseignants_par_grade[grade_code])

                if grade_code == "EX":
                    # Quota fixe pour les experts
                    quota = expert_quota
                else:
                    # Utiliser le quota calculé pour ce groupe
                    quota = quotas_calcules[i]

                total_surv = nb_ens * quota

                quotas[grade_code] = {
                    "grade_nom": GRADES.get(grade_code, {}).get("nom", grade_code),
                    "nb_enseignants": nb_ens,
                    "quota": quota,
                    "total_surveillances": total_surv,
                    "groupe_hierarchique": i + 1,
                }

        return quotas

    def _calculer_quota_base_optimal(
        self,
        enseignants_par_grade: Dict[str, List[Enseignant]],
        hierarchie_groupes: List[List[str]],
        total_surveillances_requis: int,
        quota_min_groupe1: int,
        difference_min_pr_ma: int,
        difference_min_ma_as: int,
        difference_min_as_ac: int,
    ) -> List[int]:
        """
        Calcule les quotas optimaux pour chaque groupe en respectant l'ordre strict.
        
        Retourne une liste de quotas [q0, q1, q2, q3] où:
        - q0: quota pour PR/MC/V (>= quota_min_groupe1)
        - q1: quota pour MA (= q0 + difference_min_pr_ma, max q0 + 3)
        - q2: quota pour AS (= q1 + difference_min_ma_as, max q1 + 3)
        - q3: quota pour AC/PES/PTC (= q2 + difference_min_as_ac, max q2 + 3)
        
        Garantit: q0 < q1 < q2 < q3 (ordre strict)
        
        Chaque différence minimale est configurable indépendamment.
        """

        def calculer_total_avec_quotas(quotas: List[int]) -> int:
            """Calcule le total de surveillances avec les quotas donnés"""
            total = 0
            for i, groupe in enumerate(hierarchie_groupes):
                for grade_code in groupe:
                    if grade_code == "EX" or grade_code not in enseignants_par_grade:
                        continue
                    nb_ens = len(enseignants_par_grade[grade_code])
                    quota = quotas[i]
                    total += nb_ens * quota
            return total

        # Recherche des quotas optimaux avec contraintes:
        # - q0 >= quota_min_groupe1 (quota minimal pour PR/MC/V)
        # - q1 (MA) - q0 >= difference_min_pr_ma
        # - q2 (AS) - q1 >= difference_min_ma_as
        # - q3 (AC/PES/PTC) - q2 >= difference_min_as_ac
        # - chaque différence entre groupes adjacents <= 3
        quota_min = quota_min_groupe1
        quota_max = 20

        best_quotas = None
        best_total = None

        for q0 in range(quota_min, quota_max + 1):
            # q1 must satisfy difference_min_pr_ma and max step 3
            q1_min = q0 + difference_min_pr_ma
            q1_max = min(quota_max, q0 + 3)
            if q1_min > q1_max:
                # cannot satisfy both difference_min_pr_ma and max-step constraint
                continue

            for q1 in range(q1_min, q1_max + 1):
                # q2 must be >= q1 + difference_min_ma_as and not more than q1+3
                q2_min = q1 + difference_min_ma_as
                q2_max = min(quota_max, q1 + 3)
                if q2_min > q2_max:
                    continue

                for q2 in range(q2_min, q2_max + 1):
                    # q3 must be >= q2 + difference_min_as_ac and not more than q2+3
                    q3_min = q2 + difference_min_as_ac
                    q3_max = min(quota_max, q2 + 3)
                    if q3_min > q3_max:
                        continue

                    for q3 in range(q3_min, q3_max + 1):
                        quotas = [q0, q1, q2, q3]
                        total = calculer_total_avec_quotas(quotas)

                        if total >= total_surveillances_requis:
                            # choose best: minimal total, then minimal q0, q1...
                            if best_quotas is None:
                                best_quotas = quotas.copy()
                                best_total = total
                            else:
                                if total < best_total:
                                    best_quotas = quotas.copy()
                                    best_total = total
                                elif total == best_total:
                                    # tie-breaker: prefer lexicographically smaller quotas
                                    if quotas < best_quotas:
                                        best_quotas = quotas.copy()
                                        best_total = total
                            # Found a feasible combination for this q3; keep searching to possibly find tighter total

        # Si aucune solution trouvée dans les bornes, retomber sur une heuristique
        if best_quotas is None:
            # fallback: respect minimal pattern
            q0 = min(10, quota_max)
            q1 = min(q0 + difference_min_pr_ma, quota_max)
            q2 = min(q1 + difference_min_ma_as, quota_max)
            q3 = min(q2 + difference_min_as_ac, quota_max)
            best_quotas = [q0, q1, q2, q3]

        return best_quotas

    def _analyser_distribution_temporelle(
        self,
        seances_details: List[Dict],
        enseignants_par_grade: Dict[str, List[Enseignant]],
    ) -> Dict:
        """
        Analyse la distribution des examens dans le temps.
        
        CONTRAINTE CRITIQUE: Détecte les jours où la charge dépasse la capacité disponible.
        
        Vérifie:
        1. Séances simultanées impossibles (plus de surveillants requis que d'enseignants disponibles)
        2. Jours surchargés (charge > capacité maximale)
        3. Créneaux critiques (utilisation > 90%)
        4. Distribution équilibrée dans le temps
        
        Retourne l'analyse complète avec alertes.
        """
        alertes = []
        
        # Calculer le nombre total d'enseignants et capacités
        nb_total_enseignants = sum(len(ens_list) for ens_list in enseignants_par_grade.values())
        
        if nb_total_enseignants == 0:
            return {
                "charge_par_jour": {},
                "alertes": [],
                "jour_le_plus_charge": None,
                "variance_charge": 0,
            }
        
        # NOUVELLE VÉRIFICATION CRITIQUE: Détecter les séances simultanées impossibles
        # Grouper par (date, h_debut, h_fin) pour identifier les séances qui ont lieu en même temps
        from collections import defaultdict
        seances_simultanees = defaultdict(list)
        for seance in seances_details:
            cle = (seance.get("date"), seance.get("h_debut"), seance.get("h_fin"))
            seances_simultanees[cle].append(seance)
        
        # Vérifier chaque groupe de séances simultanées
        for (date, h_debut, h_fin), seances in seances_simultanees.items():
            total_surveillants_requis = sum(s.get("nb_surveillants_requis", 0) for s in seances)
            
            # CRITIQUE: Plus de surveillants requis simultanément que d'enseignants disponibles
            # Un enseignant ne peut pas être à deux endroits en même temps !
            if total_surveillants_requis > nb_total_enseignants:
                nb_salles = len(seances)
                alertes.append({
                    "type": "SEANCE_IMPOSSIBLE",
                    "date": date,
                    "h_debut": h_debut,
                    "h_fin": h_fin,
                    "nb_salles": nb_salles,
                    "surveillants_requis": total_surveillants_requis,
                    "enseignants_disponibles": nb_total_enseignants,
                    "deficit": total_surveillants_requis - nb_total_enseignants,
                    "severite": "CRITIQUE",
                    "message": f"❌ IMPOSSIBLE: Le {date} de {h_debut} à {h_fin}: {total_surveillants_requis} surveillants requis pour {nb_salles} salle(s) simultanée(s) mais seulement {nb_total_enseignants} enseignant(s) disponible(s) (déficit: {total_surveillants_requis - nb_total_enseignants}). Un enseignant ne peut pas être à plusieurs endroits en même temps !"
                })
        
        # Calculer le nombre_max moyen de tous les enseignants
        nombre_max_total = sum(
            ens.nombre_max 
            for ens_list in enseignants_par_grade.values() 
            for ens in ens_list
        )
        nombre_max_moyen = nombre_max_total / nb_total_enseignants
        
        # Capacité maximale théorique par jour = tous les enseignants × leur nombre_max moyen
        capacite_max_par_jour = int(nb_total_enseignants * nombre_max_moyen)
        
        # Grouper les séances par jour
        from collections import defaultdict
        charge_par_jour = defaultdict(int)
        seances_par_jour = defaultdict(list)
        
        for seance in seances_details:
            date = seance.get("date")
            if not date:
                continue
            
            nb_surveillants = seance.get("nb_surveillants_requis", 0)
            charge_par_jour[date] += nb_surveillants
            seances_par_jour[date].append(seance)
        
        # Analyser chaque jour
        for date, charge in charge_par_jour.items():
            taux_utilisation = (charge / capacite_max_par_jour * 100) if capacite_max_par_jour > 0 else 0
            
            # Jour SURCHARGE (charge > capacité)
            if charge > capacite_max_par_jour:
                alertes.append({
                    "type": "JOUR_SURCHARGE",
                    "date": date,
                    "charge_requise": charge,
                    "capacite_max": capacite_max_par_jour,
                    "deficit": charge - capacite_max_par_jour,
                    "taux_utilisation": round(taux_utilisation, 1),
                    "nb_seances": len(seances_par_jour[date]),
                    "severite": "CRITIQUE",
                    "message": f"Le {date}: {charge} surveillances requises mais seulement {capacite_max_par_jour} disponibles (déficit: {charge - capacite_max_par_jour})"
                })
            
            # Jour CRITIQUE (utilisation > 90%)
            elif taux_utilisation > 90:
                alertes.append({
                    "type": "JOUR_CRITIQUE",
                    "date": date,
                    "charge_requise": charge,
                    "capacite_max": capacite_max_par_jour,
                    "marge": capacite_max_par_jour - charge,
                    "taux_utilisation": round(taux_utilisation, 1),
                    "nb_seances": len(seances_par_jour[date]),
                    "severite": "ATTENTION",
                    "message": f"Le {date}: utilisation à {round(taux_utilisation, 1)}% de la capacité (marge faible: {capacite_max_par_jour - charge})"
                })
            
            # Jour avec charge modérée (70-90%)
            elif taux_utilisation > 70:
                alertes.append({
                    "type": "JOUR_CHARGE_MODEREE",
                    "date": date,
                    "charge_requise": charge,
                    "capacite_max": capacite_max_par_jour,
                    "taux_utilisation": round(taux_utilisation, 1),
                    "nb_seances": len(seances_par_jour[date]),
                    "severite": "INFO",
                    "message": f"Le {date}: utilisation à {round(taux_utilisation, 1)}% (charge modérée)"
                })
        
        # Calculer la variance de la charge (pour détecter déséquilibre)
        if len(charge_par_jour) > 1:
            charges = list(charge_par_jour.values())
            moyenne = sum(charges) / len(charges)
            variance = sum((c - moyenne) ** 2 for c in charges) / len(charges)
            ecart_type = variance ** 0.5
            
            # Si l'écart-type est > 30% de la moyenne, c'est déséquilibré
            if moyenne > 0 and (ecart_type / moyenne) > 0.3:
                alertes.append({
                    "type": "DISTRIBUTION_DESEQUILIBREE",
                    "variance": round(variance, 2),
                    "ecart_type": round(ecart_type, 2),
                    "moyenne": round(moyenne, 2),
                    "severite": "ATTENTION",
                    "message": f"Distribution déséquilibrée: certains jours sont beaucoup plus chargés que d'autres (écart-type: {round(ecart_type, 1)})"
                })
        else:
            variance = 0
        
        # Trouver le jour le plus chargé
        jour_le_plus_charge = max(charge_par_jour.items(), key=lambda x: x[1]) if charge_par_jour else None
        
        return {
            "charge_par_jour": dict(charge_par_jour),
            "capacite_max_par_jour": capacite_max_par_jour,
            "alertes": alertes,
            "jour_le_plus_charge": {
                "date": jour_le_plus_charge[0],
                "charge": jour_le_plus_charge[1],
                "taux_utilisation": round((jour_le_plus_charge[1] / capacite_max_par_jour * 100), 1) if capacite_max_par_jour > 0 else 0
            } if jour_le_plus_charge else None,
            "variance_charge": round(variance, 2) if 'variance' in locals() else 0,
            "nb_jours_total": len(charge_par_jour),
            "charge_moyenne_par_jour": round(sum(charge_par_jour.values()) / len(charge_par_jour), 1) if charge_par_jour else 0,
        }

    def _verifier_egalite_stricte_divisibilite(
        self,
        enseignants_par_grade: Dict[str, List[Enseignant]],
        quotas_recommandes: Dict[str, Dict],
    ) -> Dict:
        """
        Vérifie la faisabilité mathématique de l'égalité stricte par grade.
        
        PROBLÈME CRITIQUE DE DIVISIBILITÉ:
        - L'optimizer impose une ÉGALITÉ STRICTE: tous les enseignants d'un même grade font EXACTEMENT le même nombre de séances
        - Pour que cela soit possible, le nombre total de surveillances requis pour un grade doit être 
          EXACTEMENT divisible par le nombre d'enseignants de ce grade
        
        Exemple de conflit:
        - Grade PR: 3 enseignants, quota recommandé = 2 séances/enseignant
        - Total requis = 3 × 2 = 6 affectations pour les PR
        - Mais le planning nécessite 7 affectations de PR
        - 7 ÷ 3 = 2.33... → IMPOSSIBLE de donner exactement 2 séances à chacun !
        
        NOTE IMPORTANTE: Ce conflit est INDÉPENDANT des responsables d'examens.
        Même sans responsables, si le total n'est pas divisible, l'égalité stricte échoue.
        """
        conflits = []
        
        for grade_code, quota_info in quotas_recommandes.items():
            nb_enseignants = quota_info["nb_enseignants"]
            quota = quota_info["quota"]
            total_disponible = quota_info["total_surveillances"]  # = nb_enseignants × quota
            
            if nb_enseignants == 0:
                continue
            
            # Vérification: le total doit être exactement nb_enseignants × quota
            # Si ce n'est pas le cas, c'est qu'il y a un problème de divisibilité
            # Note: normalement cette vérification est toujours vraie car total_disponible = nb_enseignants × quota
            # MAIS elle devient critique quand on compare avec le total RÉELLEMENT NÉCESSAIRE
            
            # Le vrai problème: est-ce que le quota permet de couvrir les besoins réels ?
            # On ne peut pas vérifier ici sans connaître la répartition exacte des besoins par grade
            # Cette vérification sera faite dans _verifier_divisibilite_besoins_reels()
            pass
        
        return {
            "conflits": conflits,
            "nb_conflits": 0,
            "has_conflits": False,
            "message": "Vérification de divisibilité OK (vérification simplifiée)"
        }

    def _verifier_conflit_responsables_egalite(
        self,
        examens: List[Examen],
        enseignants_par_grade: Dict[str, List[Enseignant]],
        quotas_recommandes: Dict[str, Dict],
    ) -> Dict:
        """
        Vérifie le conflit entre l'égalité stricte par grade et les responsables d'examens.
        
        IMPORTANT: La présence du responsable est une CONTRAINTE SOUPLE (non bloquante).
        
        PROBLÈME DÉTECTÉ (INFORMATIF):
        - L'optimizer impose une ÉGALITÉ STRICTE: tous les enseignants d'un même grade font EXACTEMENT le même nombre de séances
        - Un responsable d'examen est ENCOURAGÉ (mais pas obligé) à être présent à son examen
        - Si un responsable a PLUS d'examens que le quota de son grade, l'optimizer peut:
          * Soit violer la contrainte souple (responsable absent à certains examens)
          * Soit trouver une autre solution
        
        Exemple:
        - Grade PR: quota recommandé = 4 séances
        - Tous les PR doivent faire EXACTEMENT 4 séances (égalité stricte DURE)
        - Mais Responsable_PR_1 a 6 examens sur 6 séances différentes
        - L'optimizer peut NE PAS affecter le responsable à tous ses examens (contrainte SOUPLE)
        → PAS BLOQUANT, mais informatif
        
        Cette vérification détecte ces situations AVANT la génération pour informer l'utilisateur.
        """
        conflits = []
        
        # 1. Identifier tous les responsables d'examens
        responsables_examens = {}  # {enseignant_id: [liste_examens]}
        
        for exam in examens:
            if hasattr(exam, "enseignant") and exam.enseignant:
                # Le champ enseignant contient le code smartex du responsable
                responsable = None
                
                # Chercher le responsable dans tous les enseignants (même ceux qui ne participent pas)
                for grade_code, ens_list in enseignants_par_grade.items():
                    for ens in ens_list:
                        if ens.code_smartex == exam.enseignant:
                            responsable = ens
                            break
                    if responsable:
                        break
                
                if responsable:
                    if responsable.id not in responsables_examens:
                        responsables_examens[responsable.id] = {
                            "enseignant": responsable,
                            "examens": [],
                            "seances": set()
                        }
                    
                    responsables_examens[responsable.id]["examens"].append(exam)
                    
                    # Identifier la séance (date + heure)
                    seance_key = (exam.dateExam, exam.h_debut, exam.h_fin)
                    responsables_examens[responsable.id]["seances"].add(seance_key)
        
        # 2. Pour chaque responsable, vérifier si le nombre de séances dépasse le quota de son grade
        nb_conflits_critiques = 0
        nb_conflits_attentions = 0
        
        for resp_id, resp_info in responsables_examens.items():
            enseignant = resp_info["enseignant"]
            nb_seances_responsable = len(resp_info["seances"])
            nb_examens = len(resp_info["examens"])
            
            grade_code = enseignant.grade_code
            
            # Vérifier si ce grade a un quota recommandé
            if grade_code not in quotas_recommandes:
                continue
            
            quota_grade = quotas_recommandes[grade_code]["quota"]
            
            # INFORMATION: Le responsable a PLUS de séances que le quota de son grade
            # IMPORTANT: Contrainte souple - l'optimizer peut ne pas affecter le responsable à tous ses examens
            if nb_seances_responsable > quota_grade:
                conflit = {
                    "type": "INFORMATION",
                    "enseignant_id": enseignant.id,
                    "enseignant_nom": enseignant.nom,
                    "enseignant_prenom": enseignant.prenom,
                    "grade": grade_code,
                    "quota_grade": quota_grade,
                    "nb_seances_responsable": nb_seances_responsable,
                    "nb_examens": nb_examens,
                    "ecart": nb_seances_responsable - quota_grade,
                    "severite": "INFO",
                    "message": (
                        f"ℹ️ INFO: {enseignant.nom} {enseignant.prenom} ({grade_code}) "
                        f"est responsable de {nb_examens} examen(s) sur {nb_seances_responsable} séance(s) différente(s), "
                        f"mais le quota de son grade est {quota_grade}. "
                        f"L'égalité stricte impose que TOUS les {grade_code} fassent exactement {quota_grade} séances. "
                        f"L'optimizer pourra NE PAS affecter {enseignant.nom} à tous ses examens (contrainte souple)."
                    ),
                    "recommandation": (
                        f"Solutions pour maximiser la présence du responsable:\n"
                        f"1. Augmenter le quota du grade {grade_code} à au moins {nb_seances_responsable}\n"
                        f"2. Réaffecter certains examens de {enseignant.nom} à d'autres responsables\n"
                        f"3. Regrouper certains examens dans les mêmes séances\n"
                        f"Note: L'optimizer peut générer une solution même si {enseignant.nom} n'est pas présent partout."
                    )
                }
                conflits.append(conflit)
                nb_conflits_critiques += 1  # Compteur pour statistiques (même si non bloquant)
            
            # ATTENTION: Le responsable est proche du quota (même nombre ou juste en dessous)
            elif nb_seances_responsable == quota_grade:
                conflit = {
                    "type": "ATTENTION",
                    "enseignant_id": enseignant.id,
                    "enseignant_nom": enseignant.nom,
                    "enseignant_prenom": enseignant.prenom,
                    "grade": grade_code,
                    "quota_grade": quota_grade,
                    "nb_seances_responsable": nb_seances_responsable,
                    "nb_examens": nb_examens,
                    "ecart": 0,
                    "severite": "ATTENTION",
                    "message": (
                        f"⚠️ ATTENTION: {enseignant.nom} {enseignant.prenom} ({grade_code}) "
                        f"est responsable de {nb_examens} examen(s) sur {nb_seances_responsable} séance(s), "
                        f"ce qui correspond EXACTEMENT au quota de son grade ({quota_grade}). "
                        f"Il devra être présent à TOUTES ses séances d'examens, sans aucune flexibilité."
                    ),
                    "recommandation": (
                        f"Aucun problème majeur, mais {enseignant.nom} aura une charge fixe sans marge de manœuvre."
                    )
                }
                conflits.append(conflit)
                nb_conflits_attentions += 1
        
        return {
            "conflits": conflits,
            "nb_conflits_critiques": nb_conflits_critiques,
            "nb_conflits_attentions": nb_conflits_attentions,
            "nb_total_responsables": len(responsables_examens),
            "has_conflits_critiques": nb_conflits_critiques > 0,
            "has_conflits_attentions": nb_conflits_attentions > 0,
        }

    def _calculer_voeux_autorises(
        self,
        enseignants_par_grade: Dict[str, List[Enseignant]],
        stats_examens: Dict,
        quotas_recommandes: Dict[str, Dict],
    ) -> Dict[str, Dict]:
        """
        Calcule le nombre de créneaux de non-souhaits autorisés par grade.
        
        Règle: Plus le quota est élevé, moins l'enseignant peut exprimer de non-souhaits.
        Formule stricte: nb_voeux_max = max(0, floor((nb_total_seances - quota) * 0.6))
        
        On autorise seulement 60% de la différence pour être plus restrictif
        """
        nb_total_seances = stats_examens["nb_total_seances"]
        voeux_autorises = {}

        for grade_code, quota_info in quotas_recommandes.items():
            quota = quota_info["quota"]

            # Calculer la différence entre le total de séances et le quota
            difference = nb_total_seances - quota

            # Nombre de voeux autorisés = 60% de la différence (formule stricte)
            nb_voeux_max = max(0, int(difference * 0.6))

            # Pourcentage de voeux autorisés
            pourcentage = (
                round((nb_voeux_max / nb_total_seances) * 100, 1)
                if nb_total_seances > 0
                else 0
            )

            voeux_autorises[grade_code] = {
                "grade_nom": quota_info["grade_nom"],
                "quota": quota,
                "nb_total_seances": nb_total_seances,
                "nb_voeux_max_recommande": nb_voeux_max,
                "pourcentage_voeux_autorises": pourcentage,
                "message": self._generer_message_voeux(nb_voeux_max, nb_total_seances),
            }

        return voeux_autorises

    def _generer_message_voeux(self, nb_voeux_max: int, nb_total_seances: int) -> str:
        """Génère un message explicatif pour les voeux autorisés"""
        if nb_voeux_max == 0:
            return "⚠️ Aucun créneau de non-souhait recommandé pour garantir une solution"
        elif nb_voeux_max < nb_total_seances * 0.3:
            return "⚠️ Très peu de créneaux de non-souhait autorisés"
        elif nb_voeux_max < nb_total_seances * 0.5:
            return "✓ Nombre modéré de créneaux de non-souhait autorisés"
        else:
            return "✓ Large flexibilité pour les créneaux de non-souhait"

    def _analyser_faisabilite(
        self,
        enseignants_par_grade: Dict[str, List[Enseignant]],
        quotas_recommandes: Dict[str, Dict],
        stats_examens: Dict,
        distribution_temporelle: Dict,
        conflit_responsables: Dict,
    ) -> Dict:
        """Analyse la faisabilité du planning avec les quotas recommandés"""

        # Calculer le total de surveillances disponibles
        total_disponible = sum(
            quota_info["total_surveillances"]
            for quota_info in quotas_recommandes.values()
        )

        total_necessaire = stats_examens["total_surveillances_necessaires"]
        total_majore = stats_examens["total_surveillances_majorees"]

        # INFORMATION: Conflits responsables vs égalité stricte (NON BLOQUANT - contrainte souple)
        conflits_resp_info = conflit_responsables.get("has_conflits_critiques", False)
        nb_conflits_resp = conflit_responsables.get("nb_conflits_critiques", 0)

        # VÉRIFICATION PRIORITAIRE 1: Séances simultanées impossibles (BLOQUANT)
        alertes_distribution = distribution_temporelle.get("alertes", [])
        seances_impossibles = [a for a in alertes_distribution if a.get("type") == "SEANCE_IMPOSSIBLE"]
        
        # VÉRIFICATION PRIORITAIRE 2: Vérifier contrainte nombre_max par jour (BLOQUANT)
        violations_nombre_max = self._verifier_nombre_max_respecte(
            enseignants_par_grade,
            quotas_recommandes,
            stats_examens["seances_details"]
        )

        # Calculer les marges
        marge_absolue = total_disponible - total_necessaire
        marge_majoree = total_disponible - total_majore

        pourcentage_couverture = (
            round((total_disponible / total_necessaire) * 100, 2)
            if total_necessaire > 0
            else 0
        )

        # Déterminer le statut (SANS tenir compte des responsables - contrainte souple)
        if seances_impossibles:
            # CRITIQUE PRIORITÉ 1: Séances impossibles détectées (BLOQUANT)
            statut = "CRITIQUE"
            niveau_risque = "Élevé"
            nb_seances = len(seances_impossibles)
            total_deficit = sum(a.get("deficit", 0) for a in seances_impossibles)
            message = f"❌ IMPOSSIBLE: {nb_seances} séance(s) nécessite(nt) plus de surveillants simultanément ({total_deficit} manquants) que d'enseignants disponibles"
        elif violations_nombre_max:
            # CRITIQUE PRIORITÉ 2: Violations nombre_max (BLOQUANT)
            statut = "CRITIQUE"
            niveau_risque = "Élevé"
            nb_violations = len(violations_nombre_max)
            message = f"❌ {nb_violations} enseignant(s) ne peuvent pas respecter le quota avec leur nombre_max/jour"
        elif marge_majoree >= 0:
            statut = "OPTIMAL"
            niveau_risque = "Faible"
            message = "✅ Le planning est réalisable avec une marge confortable"
        elif marge_absolue >= 0:
            statut = "ACCEPTABLE"
            niveau_risque = "Moyen"
            message = (
                "⚠️ Le planning est réalisable mais avec peu de marge pour les absences"
            )
        else:
            statut = "CRITIQUE"
            niveau_risque = "Élevé"
            message = "❌ Ressources insuffisantes : augmentez les quotas ou réduisez les examens"

        return {
            "statut": statut,
            "niveau_risque": niveau_risque,
            "message": message,
            "total_surveillances_disponibles": total_disponible,
            "total_surveillances_necessaires": total_necessaire,
            "total_surveillances_majorees": total_majore,
            "marge_absolue": marge_absolue,
            "marge_majoree": marge_majoree,
            "pourcentage_couverture": pourcentage_couverture,
            "violations_nombre_max": violations_nombre_max,
            "seances_impossibles": seances_impossibles,
            "conflits_responsables_info": conflits_resp_info,  # INFO (non bloquant)
            "nb_conflits_responsables": nb_conflits_resp,  # INFO
        }

    def _verifier_nombre_max_respecte(
        self,
        enseignants_par_grade: Dict[str, List[Enseignant]],
        quotas_recommandes: Dict[str, Dict],
        seances_details: List[Dict],
    ) -> List[Dict]:
        """
        Vérifie que les quotas sont compatibles avec le nombre_max PAR JOUR.
        
        IMPORTANT: nombre_max = nombre maximal de surveillances PAR JOUR
        
        Pour chaque enseignant:
        - Calcule quota_max_possible = nombre_max × nb_jours_planning
        - Vérifie que quota_recommandé ≤ quota_max_possible
        
        Retourne la liste des violations détectées.
        """
        violations = []
        
        # Calculer le nombre de jours uniques dans le planning
        jours_uniques = set(s["date"] for s in seances_details if s.get("date"))
        nb_jours = len(jours_uniques) if jours_uniques else 1  # Au moins 1 jour
        
        for grade_code, quota_info in quotas_recommandes.items():
            quota_recommande = quota_info["quota"]
            
            enseignants = enseignants_par_grade.get(grade_code, [])
            for ens in enseignants:
                # Quota maximal possible pour cet enseignant sur toute la période
                quota_max_possible = ens.nombre_max * nb_jours
                
                if quota_recommande > quota_max_possible:
                    violations.append({
                        "enseignant": ens.nom,
                        "grade": grade_code,
                        "nombre_max_par_jour": ens.nombre_max,
                        "nb_jours_planning": nb_jours,
                        "quota_max_possible": quota_max_possible,
                        "quota_recommande": quota_recommande,
                        "ecart": quota_recommande - quota_max_possible,
                        "message": f"{ens.nom}: impossible de faire {quota_recommande} surveillances sur {nb_jours} jours (max: {ens.nombre_max}/jour)"
                    })
        
        return violations


    def _generer_alertes(
        self,
        enseignants_par_grade: Dict[str, List[Enseignant]],
        quotas_recommandes: Dict[str, Dict],
        stats_examens: Dict,
        faisabilite: Dict,
        distribution_temporelle: Dict,
        conflit_responsables: Dict,
    ) -> List[Dict]:
        """Génère les alertes et recommandations"""
        alertes = []

        # INFORMATION: Conflits responsables vs égalité stricte (INFORMATIF - NON BLOQUANT)
        conflits_resp = conflit_responsables.get("conflits", [])
        conflits_info = [c for c in conflits_resp if c.get("type") == "INFORMATION"]
        conflits_attentions = [c for c in conflits_resp if c.get("type") == "ATTENTION"]
        
        if conflits_info:
            nb_conflits = len(conflits_info)
            
            # Créer la liste des enseignants concernés pour le message principal
            enseignants_en_conflit = [
                f"{c['enseignant_nom']} {c['enseignant_prenom']} ({c['grade']}): {c['nb_seances_responsable']} séances > quota {c['quota_grade']}"
                for c in conflits_info
            ]
            
            message_principal = f"⚠️ {nb_conflits} responsable(s) avec plus d'examens que le quota de leur grade\n"
            message_principal += "Enseignants concernés:\n"
            for i, ens_info in enumerate(enseignants_en_conflit, 1):
                message_principal += f"  {i}. {ens_info}\n"
            
            alertes.append({
                "type": "ATTENTION",
                "categorie": "RESPONSABLES_QUOTA_DEPASSE",
                "message": message_principal,
                "details": [c["message"] for c in conflits_info],
                "recommandations": [c["recommandation"] for c in conflits_info],
                "nb_conflits": nb_conflits,
                "enseignants_concernes": enseignants_en_conflit,
            })
        
        if conflits_attentions:
            nb_attentions = len(conflits_attentions)
            
            # Créer la liste des enseignants en attention
            enseignants_en_attention = [
                f"{c['enseignant_nom']} {c['enseignant_prenom']} ({c['grade']}): {c['nb_seances_responsable']} séances = quota {c['quota_grade']}"
                for c in conflits_attentions
            ]
            
            message_attention = f"⚠️ {nb_attentions} responsable(s) avec un nombre d'examens égal à leur quota (aucune flexibilité)\n"
            message_attention += "Enseignants concernés:\n"
            for i, ens_info in enumerate(enseignants_en_attention, 1):
                message_attention += f"  {i}. {ens_info}\n"
            
            alertes.append({
                "type": "ATTENTION",
                "categorie": "RESPONSABLES_QUOTA_EXACT",
                "message": message_attention,
                "details": [c["message"] for c in conflits_attentions],
                "recommandations": [c["recommandation"] for c in conflits_attentions],
                "nb_attentions": nb_attentions,
                "enseignants_concernes": enseignants_en_attention,
            })

        # ALERTE PRIORITAIRE 1: Séances simultanées impossibles (BLOQUANT)
        alertes_distribution = distribution_temporelle.get("alertes", [])
        seances_impossibles = [a for a in alertes_distribution if a.get("type") == "SEANCE_IMPOSSIBLE"]
        if seances_impossibles:
            nb_seances_impossibles = len(seances_impossibles)
            total_deficit = sum(a.get("deficit", 0) for a in seances_impossibles)
            
            alertes.append({
                "type": "BLOQUANT",
                "categorie": "SEANCES_IMPOSSIBLES",
                "message": f"🚫 {nb_seances_impossibles} séance(s) IMPOSSIBLE(S) à couvrir: plus de surveillants requis simultanément que d'enseignants disponibles !",
                "details": [a["message"] for a in seances_impossibles],
                "deficit_total": total_deficit
                                        })

        # ALERTE PRIORITAIRE 2: Distribution temporelle (CRITIQUE/ATTENTION)
        if alertes_distribution:
            # Séparer par sévérité
            critiques = [a for a in alertes_distribution if a.get("severite") == "CRITIQUE" and a.get("type") != "SEANCE_IMPOSSIBLE"]
            attentions = [a for a in alertes_distribution if a.get("severite") == "ATTENTION"]
            
            if critiques:
                jours_surcharges = [a["date"] for a in critiques if a["type"] == "JOUR_SURCHARGE"]
                if jours_surcharges:
                    alertes.append({
                        "type": "CRITIQUE",
                        "categorie": "DISTRIBUTION_TEMPORELLE",
                        "message": f"{len(jours_surcharges)} jour(s) SURCHARGÉ(S): charge > capacité disponible",
                        "details": [a["message"] for a in critiques if a["type"] == "JOUR_SURCHARGE"],
                        "jours_concernes": jours_surcharges,
                    })
            
            if attentions:
                jours_critiques = [a["date"] for a in attentions if a["type"] == "JOUR_CRITIQUE"]
                if jours_critiques:
                    alertes.append({
                        "type": "ATTENTION",
                        "categorie": "DISTRIBUTION_TEMPORELLE",
                        "message": f"{len(jours_critiques)} jour(s) avec charge critique (>90% capacité)",
                        "details": [a["message"] for a in attentions if a["type"] == "JOUR_CRITIQUE"],
                        "jours_concernes": jours_critiques,
                        "recommandation": "Marge faible pour gérer les absences sur ces jours",
                    })
                
                # Distribution déséquilibrée
                desequilibre = next((a for a in attentions if a["type"] == "DISTRIBUTION_DESEQUILIBREE"), None)
                if desequilibre:
                    alertes.append({
                        "type": "ATTENTION",
                        "categorie": "DISTRIBUTION_TEMPORELLE",
                        "message": "Distribution déséquilibrée dans le temps",
                        "details": [desequilibre["message"]],
                        "recommandation": "Essayer de mieux répartir les examens entre les jours",
                    })

        # ALERTE PRIORITAIRE 3: Violations nombre_max par jour
        violations_nombre_max = faisabilite.get("violations_nombre_max", [])
        if violations_nombre_max:
            # Grouper par grade pour recommandations ciblées
            violations_par_grade = {}
            for v in violations_nombre_max:
                grade = v["grade"]
                if grade not in violations_par_grade:
                    violations_par_grade[grade] = []
                violations_par_grade[grade].append(v)
            
            for grade, viols in violations_par_grade.items():
                # Calculer le quota maximal réalisable pour ce grade
                quota_actuel = quotas_recommandes[grade]["quota"]
                nb_ens_grade = len(enseignants_par_grade[grade])
                
                # Trouver le nombre_max minimal dans ce grade
                nombre_max_min = min(v["nombre_max_par_jour"] for v in viols)
                nb_jours = viols[0]["nb_jours_planning"]
                quota_max_safe = nombre_max_min * nb_jours
                
                alertes.append({
                    "type": "CRITIQUE",
                    "categorie": "NOMBRE_MAX",
                    "message": f"Grade {grade}: {len(viols)} enseignant(s) ne peuvent pas respecter le quota de {quota_actuel}",
                    "details": [v["message"] for v in viols],
                    "recommandation": f"Réduire le quota {grade} de {quota_actuel} à maximum {quota_max_safe}, ou augmenter nombre_max de certains enseignants",
                })

        # Alerte si faisabilité critique (ressources globales)
        if faisabilite["statut"] == "CRITIQUE" and not violations_nombre_max:
            alertes.append(
                {
                    "type": "CRITIQUE",
                    "categorie": "FAISABILITE",
                    "message": "Ressources insuffisantes pour couvrir tous les examens",
                    "recommandation": "Augmentez les quotas ou réduisez le nombre d'examens",
                }
            )

        # Alerte si faisabilité acceptable mais limite
        if faisabilite["statut"] == "ACCEPTABLE":
            alertes.append(
                {
                    "type": "ATTENTION",
                    "categorie": "FAISABILITE",
                    "message": "Marge faible pour gérer les absences",
                    "recommandation": "Considérez augmenter légèrement les quotas",
                }
            )

        # Alerte si déséquilibre dans les grades
        grades_sans_enseignants = [
            grade for grade in ["PR", "MC", "MA", "AS"] if grade not in enseignants_par_grade
        ]
        if grades_sans_enseignants:
            alertes.append(
                {
                    "type": "INFO",
                    "categorie": "REPARTITION",
                    "message": f"Aucun enseignant dans les grades: {', '.join(grades_sans_enseignants)}",
                    "recommandation": "La répartition des charges sera limitée à certains grades",
                }
            )

        # Alerte si quotas très élevés
        quotas_eleves = [
            (grade, info["quota"])
            for grade, info in quotas_recommandes.items()
            if info["quota"] > 10
        ]
        if quotas_eleves:
            for grade, quota in quotas_eleves:
                alertes.append(
                    {
                        "type": "ATTENTION",
                        "categorie": "QUOTAS",
                        "message": f"Quota très élevé pour {grade}: {quota} surveillances",
                    }
                )

        # Alerte si beaucoup de séances
        if stats_examens["nb_total_seances"] > 30:
            alertes.append(
                {
                    "type": "INFO",
                    "categorie": "PLANNING",
                    "message": f"Nombre élevé de séances ({stats_examens['nb_total_seances']})",
                }
            )

        # Si aucune alerte, tout va bien
        if not alertes:
            alertes.append(
                {
                    "type": "SUCCES",
                    "categorie": "GLOBAL",
                    "message": "Configuration optimale détectée",
                    "recommandation": "Vous pouvez procéder à la génération du planning",
                }
            )

        return alertes


    def importer_exceptions_absences(self, file_path: str) -> Tuple[int, List[str]]:
        """
        Importe les exceptions d'enseignants depuis un fichier Excel basé sur les absences.
        ATTENTION : Supprime toutes les exceptions existantes avant l'import !
        
        Colonnes attendues:
        - Nom: Nom de famille (optionnel, pour référence)
        - Prénom: Prénom (optionnel, pour référence)
        - Code: Code de l'enseignant (code_smartex) - OBLIGATOIRE
        - Absences: Nombre d'absences (positif ou négatif) - OBLIGATOIRE
        
        Règles:
        - Si Absences > 0: quota_Exception = quota_grade + Absences
        - Si Absences < 0: quota_Exception = quota_grade + Absences (diminution)
        - Si Absences = 0 ou vide: pas d'exception
        
        Args:
            file_path: Chemin du fichier Excel
            
        Returns:
            (nombre_exceptions_importees, liste_erreurs)
        """
        import pandas as pd
        from models.models import Enseignant, GradeConfig
        from config import GRADES
        
        erreurs = []
        count = 0
        
        try:
            # SUPPRIMER TOUTES LES EXCEPTIONS EXISTANTES
            nb_exceptions_supprimees = self.db.query(Enseignant).filter(
                Enseignant.is_Exception == True
            ).update({
                "is_Exception": False,
                "quota_Exception": None
            })
            self.db.commit()
            logger.info(f"🗑️  {nb_exceptions_supprimees} exceptions supprimées avant import")
            
            df = pd.read_excel(file_path)
            
            # Vérifier les colonnes obligatoires
            colonnes_requises = ['Code', 'Absences']
            colonnes_manquantes = [col for col in colonnes_requises if col not in df.columns]
            
            if colonnes_manquantes:
                erreurs.append(f"Colonnes manquantes: {', '.join(colonnes_manquantes)}")
                return 0, erreurs
            
            # Traiter ligne par ligne
            for idx, row in df.iterrows():
                try:
                    # Récupérer le code de l'enseignant
                    code_smartex = str(row['Code']).strip()
                    
                    # Vérifier que le code n'est pas vide
                    if not code_smartex or code_smartex.lower() == 'nan':
                        erreurs.append(f"Ligne {idx + 2}: Code enseignant manquant")
                        continue
                    
                    # Récupérer les absences
                    absences_val = row['Absences']
                    
                    # Vérifier que la valeur d'absences est valide
                    if pd.isna(absences_val) or str(absences_val).strip() == '':
                        # Pas d'absences, ignorer cette ligne
                        continue
                    
                    try:
                        absences = int(float(absences_val))
                    except (ValueError, TypeError):
                        erreurs.append(f"Ligne {idx + 2}: Valeur 'Absences' invalide: {absences_val}")
                        continue
                    
                    # Si absences = 0, ignorer
                    if absences == 0:
                        continue
                    
                    # Chercher l'enseignant dans la base de données
                    enseignant = self.db.query(Enseignant).filter(
                        Enseignant.code_smartex == code_smartex
                    ).first()
                    
                    if not enseignant:
                        erreurs.append(
                            f"Ligne {idx + 2}: Enseignant avec code {code_smartex} introuvable"
                        )
                        continue
                    
                    # Récupérer le quota du grade de l'enseignant
                    grade_code = enseignant.grade_code
                    
                    # D'abord chercher dans GradeConfig
                    grade_config = self.db.query(GradeConfig).filter(
                        GradeConfig.grade_code == grade_code
                    ).first()
                    
                    if grade_config:
                        quota_grade = grade_config.nb_surveillances
                    elif grade_code in GRADES:
                        quota_grade = GRADES[grade_code]["nb_surveillances"]
                    else:
                        erreurs.append(
                            f"Ligne {idx + 2}: Grade {grade_code} introuvable dans la configuration"
                        )
                        continue
                    
                    # Calculer le nouveau quota exceptionnel
                    quota_exception = quota_grade + absences
                    
                    # S'assurer que le quota ne devient pas négatif
                    if quota_exception < 0:
                        quota_exception = 0
                        erreurs.append(
                            f"Ligne {idx + 2}: Quota ajusté à 0 (quota_grade={quota_grade}, absences={absences})"
                        )
                    
                    # Marquer l'enseignant comme exception
                    enseignant.is_Exception = True
                    enseignant.quota_Exception = quota_exception
                    
                    count += 1
                    
                    logger.info(
                        f"Exception appliquée pour {enseignant.prenom} {enseignant.nom} "
                        f"({grade_code}): quota_grade={quota_grade}, absences={absences}, "
                        f"quota_exception={quota_exception}"
                    )
                    
                except Exception as e:
                    erreurs.append(f"Ligne {idx + 2}: {str(e)}")
            
            # Valider les changements
            self.db.commit()
            logger.info(f"✅ {count} exceptions importées avec succès")
            
        except Exception as e:
            self.db.rollback()
            erreurs.append(f"Erreur lors de la lecture du fichier: {str(e)}")
            logger.error(f"Erreur import exceptions: {str(e)}")
        
        return count, erreurs


    def supprimer_exceptions(self) -> int:
        """
        Supprime toutes les exceptions d'enseignants.
        Remet tous les enseignants marqués comme exceptions à l'état normal.
        
        Returns:
            Nombre d'exceptions supprimées
        """
        from models.models import Enseignant
        
        try:
            # Compter le nombre d'exceptions avant suppression
            nb_exceptions = self.db.query(Enseignant).filter(
                Enseignant.is_Exception == True
            ).count()
            
            # Supprimer toutes les exceptions
            self.db.query(Enseignant).filter(
                Enseignant.is_Exception == True
            ).update({
                "is_Exception": False,
                "quota_Exception": None
            })
            
            self.db.commit()
            logger.info(f"🗑️  {nb_exceptions} exceptions supprimées")
            
            return nb_exceptions
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Erreur suppression exceptions: {str(e)}")
            raise Exception(f"Erreur lors de la suppression: {str(e)}")
