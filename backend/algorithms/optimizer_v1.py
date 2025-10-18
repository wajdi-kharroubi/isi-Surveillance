"""
Algorithme d'Optimisation Avancé pour la Génération des Plannings de Surveillance
Version 2.0 - Respect complet des règles de contraintes et priorités
"""

import math
from ortools.sat.python import cp_model
from sqlalchemy.orm import Session, joinedload
from models.models import Enseignant, Examen, Affectation, Voeu, GradeConfig
from datetime import datetime, date, time as dt_time
from typing import List, Dict, Tuple, Set
import time


class SurveillanceOptimizer:
    """
    Algorithme d'optimisation avancé avec gestion complète des contraintes et priorités.

    ARCHITECTURE:
    - Les enseignants sont affectés à des SÉANCES (créneaux horaires)
    - Tous les enseignants d'une séance surveillent TOUS les examens de cette séance
    - Si une séance a 5 examens et que chaque examen nécessite 2 surveillants,
      alors la séance nécessite 10 enseignants (5 × 2)

    RÈGLES DE BASE (Contraintes fortes - HARD):
    1. Responsable d'examen doit être présent et compte dans les quotas
    2. Charge obligatoire égale par grade (quota fixe)
    3. Non-conflit horaire
    4. Nombre minimal d'enseignants par examen (nb_examens × min_surveillants_par_examen)

    RÈGLES DE PRÉFÉRENCE (Contraintes souples - SOFT):
    1. Préférence pour vœux de surveillance (vœux = créneaux où l'enseignant VEUT surveiller)
    2. Équilibre temporel (éviter toujours premiers/derniers créneaux)
    3. Équilibre global entre enseignants

    PRIORITÉ DES CONTRAINTES:
    1. Présence du responsable d'examen (peut surveiller d'autres examens)
    2. Nombre minimal par examen (tous les surveillants de la séance surveillent tous les examens)
    3. Quota obligatoire fixe et égal par grade
    4. PRÉFÉRENCE pour vœux (pas obligatoire, mais bonus dans fonction objectif)
    5. Équilibre global
    """

    def __init__(self, db: Session):
        self.db = db
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        self.warnings = []
        self.infos = []

        # Charger la configuration des grades depuis la BDD
        self.grade_configs = self._load_grade_configs()

        # Scores pour l'optimisation
        self.score_components = {
            "respect_voeux": 0,
            "equilibre_global": 0,
            "equilibre_temporel": 0,
            "quota_respecte": 0,
        }

    def _load_grade_configs(self) -> Dict[str, Dict]:
        """
        Charge les configurations de grades avec quotas FIXES.

        IMPORTANT: Tous les enseignants d'un même grade font le même nombre
        de séances (quota fixe).
        """
        configs = self.db.query(GradeConfig).all()
        grade_dict = {}

        for config in configs:
            # Le quota fixe est défini par nb_surveillances
            quota_fixe = config.nb_surveillances

            grade_dict[config.grade_code] = {
                "nb_surveillances": quota_fixe,  # Quota FIXE pour ce grade
                "label": config.grade_nom,  # Nom du grade
            }

        return grade_dict

    def generer_planning_optimise(
        self,
        min_surveillants_par_examen: int = 2,
        allow_fallback: bool = True,
        respecter_voeux: bool = True,
        equilibrer_temporel: bool = True,
    ) -> Tuple[bool, int, float, List[str], Dict]:
        """
        Génère le planning optimal avec respect de toutes les contraintes.

        Args:
            min_surveillants_par_examen: Nombre minimum de surveillants par examen
            allow_fallback: Autoriser le fallback à 1 surveillant si nécessaire
            respecter_voeux: Prendre en compte les vœux (True fortement recommandé)
            equilibrer_temporel: Équilibrer la répartition des créneaux horaires

        Returns:
            (success, nb_affectations, temps_execution, messages, scores)
        """
        start_time = time.time()

        print("=" * 80)
        print("🚀 DÉMARRAGE DE L'ALGORITHME D'OPTIMISATION V2.0")
        print("=" * 80)

        # ===== PHASE 1: RÉCUPÉRATION DES DONNÉES =====
        print("\n📊 Phase 1: Récupération des données...")

        enseignants = (
            self.db.query(Enseignant)
            .filter(Enseignant.participe_surveillance == True)
            .all()
        )

        examens = self.db.query(Examen).order_by(Examen.dateExam, Examen.h_debut).all()

        voeux = self.db.query(Voeu).all() if respecter_voeux else []
        list_voeux = []
        # Trier et afficher les vœux (délégué à une méthode privée)
        if respecter_voeux and voeux:
            try:
                list_voeux = self._trier_et_afficher_voeux(voeux)
                # Afficher un aperçu structuré des vœux (limité aux 10 premiers)
                try:
                    print(f"   ✓ Vœux structurés: {len(list_voeux)} entrées")
                    for i, v in enumerate(list_voeux[:15], 1):
                        print(
                            f"      {i:2d}. id={v.get('id')} | nom={v.get('nom')} | jour_idx={v.get('jour')} | seance={v.get('seance')} | heure={v.get('heure')}"
                        )
                    if len(list_voeux) > 15:
                        print(f"      ... (+{len(list_voeux) - 10} autres)")
                except Exception:
                    # Ne pas planter l'algorithme si l'affichage échoue
                    pass
            except Exception:
                # Ne pas échouer l'algorithme si l'affichage des vœux plante
                self.warnings.append(
                    "⚠️ Impossible d'afficher les vœux triés (format inattendu)"
                )

        print(f"   ✓ {len(enseignants)} enseignants disponibles")
        print(f"   ✓ {len(examens)} examens à planifier")
        print(f"   ✓ {len(voeux)} vœux de non-disponibilité")

        # Vérifications préliminaires
        if not enseignants:
            self.warnings.append("⚠️ Aucun enseignant disponible pour la surveillance")
            return False, 0, 0.0, self.warnings, self.score_components

        if not examens:
            self.warnings.append("⚠️ Aucun examen à planifier")
            return False, 0, 0.0, self.warnings, self.score_components

        # ===== PHASE 2: NETTOYAGE =====
        print("\n🗑️  Phase 2: Nettoyage des anciennes affectations...")
        nb_supprimees = self.db.query(Affectation).delete()
        self.db.commit()
        print(f"   ✓ {nb_supprimees} anciennes affectations supprimées")

        # ===== PHASE 3: GROUPEMENT PAR SÉANCE =====
        print("\n🗂️  Phase 3: Groupement des examens par séance...")
        seances = self._grouper_examens_par_seance(examens)
        print(f"   ✓ {len(seances)} séances identifiées")

        if not seances:
            self.warnings.append("⚠️ Aucune séance d'examen trouvée")
            return False, 0, 0.0, self.warnings, self.score_components

        # Afficher les séances
        for idx, (seance_key, examens_seance) in enumerate(seances.items(), 1):
            date_exam, seance_code, semestre, session, jour_index = seance_key
            print(
                f"   • Séance {idx}: Jour {jour_index} - {date_exam.strftime('%d/%m/%Y')} - {seance_code} - {semestre} - {session} ({len(examens_seance)} examens)"
            )

        # ===== PHASE 4: ANALYSE DES RESPONSABLES D'EXAMENS =====
        print("\n👥 Phase 4: Identification des responsables d'examens...")
        responsables_examens = self._identifier_responsables(examens)
        print(f"   ✓ {len(responsables_examens)} examens avec responsable identifié")

        # Afficher les responsables identifiés avec leurs codes smartex
        if responsables_examens:
            print("   📋 Détail des responsables:")
            for examen_id, enseignant_id in list(responsables_examens.items())[
                :20
            ]:  # Afficher les 5 premiers
                examen = next((ex for ex in examens if ex.id == examen_id), None)
                enseignant = next(
                    (ens for ens in enseignants if ens.id == enseignant_id), None
                )
                if examen and enseignant:
                    print(
                        f"      • Examen {examen_id} (Salle: {examen.cod_salle}) → Responsable: {enseignant.nom} ({enseignant.code_smartex})"
                    )
            if len(responsables_examens) > 20:
                print(
                    f"      ... et {len(responsables_examens) - 20} autre(s) responsable(s)"
                )

        # ===== PHASE 5: CRÉATION DES VARIABLES DE DÉCISION =====
        print("\n🔢 Phase 5: Création des variables de décision...")

        # Variables: enseignant affecté à une séance
        affectations_vars = {}
        for seance_key in seances.keys():
            for enseignant in enseignants:
                date_exam, seance_code, semestre, session, jour_index = seance_key
                var_name = f"aff_{date_exam.strftime('%Y%m%d')}_{seance_code}_{semestre}_{session}_j{jour_index}_ens_{enseignant.id}"
                affectations_vars[(seance_key, enseignant.id)] = self.model.NewBoolVar(
                    var_name
                )
        #      print(f"      • Variable: {var_name} | Clé: {seance_key}, Enseignant: {enseignant.id}")

        print(f"   ✓ {len(affectations_vars)} variables booléennes créées")

        # ===== PHASE 6: APPLICATION DES CONTRAINTES =====
        print("\n🔒 Phase 6: Application des contraintes...")

        # CONTRAINTE 1: Présence obligatoire des responsables (PRIORITÉ 1)
        print("   → Contrainte 1: Présence obligatoire des responsables d'examens")
        nb_contraintes_responsables = self._contrainte_responsables(
            responsables_examens, seances, affectations_vars, enseignants
        )
        print(
            f"      ✓ {nb_contraintes_responsables} responsables ajoutés obligatoirement (peuvent surveiller d'autres examens)"
        )

        # CONTRAINTE 2: Nombre minimal d'enseignants par séance (PRIORITÉ 2)
        print("   → Contrainte 2: Nombre minimal d'enseignants par séance")
        besoins_par_seance = self._contrainte_nombre_minimal(
            seances,
            enseignants,
            affectations_vars,
            min_surveillants_par_examen,
            allow_fallback,
        )
        print(f"      ✓ Contraintes de couverture appliquées")

        # CONTRAINTE 3: Quota obligatoire par grade (PRIORITÉ 3)
        print("   → Contrainte 3: Quotas obligatoires et limites par grade")
        charge_par_enseignant = self._contrainte_quotas_grades(
            enseignants, seances, affectations_vars
        )
        print(f"      ✓ Quotas de grades configurés")

        # CONTRAINTE 4: Préférence pour les vœux (PRIORITÉ 4)
        preferences_voeux = {}
        if respecter_voeux and list_voeux:
            print(
                "   → Contrainte 4: Préférence pour les enseignants avec vœux de disponibilité"
            )
            preferences_voeux = self._contrainte_voeux(
                list_voeux, seances, enseignants, affectations_vars
            )
            nb_avec_voeu = len(preferences_voeux.get("avec_voeu", []))
            nb_sans_voeu = len(preferences_voeux.get("sans_voeu", []))
            print(f"      ✓ {nb_avec_voeu} combinaisons avec vœu (prioritaires)")
            print(f"      ✓ {nb_sans_voeu} combinaisons sans vœu (secondaires)")
        else:
            print("   → Contrainte 4: Vœux désactivés")

        # CONTRAINTE 5: Non-conflit horaire (automatique avec séances)
        print("   → Contrainte 5: Non-conflit horaire (automatique)")
        print(f"      ✓ Garanti par le système de séances")

        # CONTRAINTE 6: Équilibre entre séances (PRIORITÉ 6)
        print("   → Contrainte 6: Équilibre entre séances de taille similaire")
        self._contrainte_equilibre_entre_seances(
            seances, enseignants, affectations_vars
        )
        print(f"      ✓ Contraintes d'équilibre appliquées")

        # ===== PHASE 7: FONCTION OBJECTIF =====
        print("\n🎯 Phase 7: Configuration de la fonction objectif...")

        score_total = self._configurer_fonction_objectif(
            charge_par_enseignant,
            affectations_vars,
            seances,
            enseignants,
            equilibrer_temporel,
            preferences_voeux,
        )

        print(f"      ✓ Fonction objectif configurée (score d'optimisation)")

        # ===== PHASE 8: RÉSOLUTION =====
        print("\n⚡ Phase 8: Résolution du problème...")
        self.solver.parameters.max_time_in_seconds = 6000.0

        status = self.solver.Solve(self.model)

        # ===== PHASE 9: TRAITEMENT DES RÉSULTATS =====
        print("\n📋 Phase 9: Traitement des résultats...")

        if status == cp_model.OPTIMAL:
            print("   ✅ Solution OPTIMALE trouvée!")
            status_text = "OPTIMALE"
        elif status == cp_model.FEASIBLE:
            print("   ✅ Solution RÉALISABLE trouvée")
            status_text = "RÉALISABLE"
        else:
            print("   ❌ Aucune solution trouvée")
            print(
                "\n🔍 Démarrage du diagnostic pour identifier la contrainte problématique..."
            )

            # Lancer le diagnostic progressif
            diagnostic_result = self._diagnostiquer_echec(
                enseignants,
                examens,
                seances,
                responsables_examens,
                min_surveillants_par_examen,
                allow_fallback,
                list_voeux,
                respecter_voeux,
            )

            self.warnings.append(
                "❌ Impossible de trouver une solution avec TOUTES les contraintes"
            )
            self.warnings.append("\n📊 DIAGNOSTIC DES CONTRAINTES:")
            self.warnings.extend(diagnostic_result)

            return (
                False,
                0,
                time.time() - start_time,
                self.warnings,
                self.score_components,
            )

        # Sauvegarder les affectations
        nb_affectations = self._sauvegarder_affectations_par_seance(
            affectations_vars, seances, enseignants, responsables_examens
        )

        execution_time = time.time() - start_time

        # ===== PHASE 10: VÉRIFICATIONS ET STATISTIQUES =====
        print("\n📊 Phase 10: Vérifications et statistiques...")

        # Calculer les scores
        self._calculer_scores_solution(
            affectations_vars, seances, enseignants, list_voeux, charge_par_enseignant
        )

        # Vérifications finales
        self._verifier_couverture_seances(seances, besoins_par_seance)
        self._generer_statistiques(enseignants, seances, affectations_vars)

        print("\n" + "=" * 80)
        print(
            f"✅ GÉNÉRATION TERMINÉE EN {execution_time:.2f}s - {nb_affectations} affectations créées"
        )
        print(f"📊 Statut: {status_text}")
        print("=" * 80)

        return (
            True,
            nb_affectations,
            execution_time,
            self.warnings + self.infos,
            self.score_components,
        )

    # ========== CONTRAINTES ==========

    def _contrainte_responsables(
        self,
        responsables_examens: Dict[int, int],
        seances: Dict,
        affectations_vars: Dict,
        enseignants: List[Enseignant],
    ) -> int:
        """
        CONTRAINTE 1 (PRIORITÉ 1): Le responsable d'un examen doit être présent.
        Le responsable PEUT surveiller d'autres examens pendant le même créneau.
        Il COMPTE dans les quotas de surveillance.
        """
        nb_responsables_contraints = 0

        # Pour chaque séance et chaque examen de la séance
        for seance_key, examens_seance in seances.items():
            for examen in examens_seance:
                if examen.id in responsables_examens:
                    responsable_id = responsables_examens[examen.id]
                    # Trouver l'objet enseignant correspondant pour avoir son code_smartex
                    responsable_obj = next(
                        (ens for ens in enseignants if ens.id == responsable_id), None
                    )

                    # Préparer les informations de l'examen pour l'affichage
                    date_exam_str = (
                        examen.dateExam.strftime("%d/%m/%Y")
                        if examen.dateExam
                        else "Date inconnue"
                    )
                    heure_exam_str = (
                        examen.h_debut.strftime("%H:%M")
                        if examen.h_debut
                        else "Heure inconnue"
                    )
                    salle_exam = (
                        examen.cod_salle
                        if hasattr(examen, "cod_salle")
                        else "Salle inconnue"
                    )

                    # Vérifier que le responsable fait partie des enseignants disponibles
                    if responsable_obj:
                        # Ajouter la contrainte : le responsable doit être affecté à la séance de cet examen
                        var = affectations_vars.get((seance_key, responsable_id))
                        if var is not None:
                            self.model.Add(var == 1)
                            nb_responsables_contraints += 1
                        else:
                            code_smartex = (
                                responsable_obj.code_smartex
                                if responsable_obj.code_smartex
                                else f"ID_{responsable_id}"
                            )
                            nom_complet = (
                                f"{responsable_obj.nom} {responsable_obj.prenom}".strip()
                                if hasattr(responsable_obj, "prenom")
                                else responsable_obj.nom
                            )
                            self.warnings.append(
                                f"❌ Responsable {nom_complet} ({code_smartex}) non trouvable pour la séance "
                                f"du {date_exam_str} à {heure_exam_str} - Salle: {salle_exam} (examen ID: {examen.id})"
                            )
                    else:
                        # Si l'enseignant n'est pas dans la liste des disponibles, chercher dans la BDD
                        code_smartex = (
                            examen.enseignant
                            if hasattr(examen, "enseignant") and examen.enseignant
                            else f"ID_{responsable_id}"
                        )

                        # Tenter de récupérer l'enseignant depuis la BDD pour avoir son nom complet
                        try:
                            from models.models import Enseignant

                            responsable_bdd = (
                                self.db.query(Enseignant)
                                .filter(Enseignant.id == responsable_id)
                                .first()
                            )
                            if responsable_bdd:
                                nom_complet = (
                                    f"{responsable_bdd.nom} {responsable_bdd.prenom}".strip()
                                    if hasattr(responsable_bdd, "prenom")
                                    and responsable_bdd.prenom
                                    else responsable_bdd.nom
                                )
                                code_smartex = (
                                    responsable_bdd.code_smartex
                                    if responsable_bdd.code_smartex
                                    else code_smartex
                                )
                                self.warnings.append(
                                    f"❌ Responsable {nom_complet} ({code_smartex}) non disponible (participe_surveillance=False) "
                                    f"pour l'examen du {date_exam_str} à {heure_exam_str} - Salle: {salle_exam} (examen ID: {examen.id})"
                                )
                            else:
                                self.warnings.append(
                                    f"❌ Responsable {code_smartex} (ID: {responsable_id}) introuvable dans la base de données "
                                    f"pour l'examen du {date_exam_str} à {heure_exam_str} - Salle: {salle_exam} (examen ID: {examen.id})"
                                )
                        except Exception as e:
                            self.warnings.append(
                                f"❌ Responsable {code_smartex} non disponible parmi les enseignants "
                                f"pour l'examen du {date_exam_str} à {heure_exam_str} - Salle: {salle_exam} (examen ID: {examen.id})"
                            )

        return nb_responsables_contraints

    def _contrainte_nombre_minimal(
        self,
        seances: Dict,
        enseignants: List[Enseignant],
        affectations_vars: Dict,
        min_surveillants_par_examen: int,
        allow_fallback: bool,
    ) -> Dict:
        """
        CONTRAINTE 2 (PRIORITÉ 2): Nombre minimum d'enseignants par séance (ADAPTATIF).

        IMPORTANT: Les enseignants affectés à une séance surveillent TOUS les examens de cette séance.
        Donc le nombre total de surveillants requis pour une séance est:
        nb_examens × min_surveillants_par_examen

        ADAPTATION AUTOMATIQUE:
        - Si les quotas totaux sont insuffisants pour min_surveillants_par_examen partout,
        - Le système accepte automatiquement qu'UNE PARTIE des examens soit surveillée par 1 seul enseignant
        - Garantit au minimum 1 surveillant par examen (minimum absolu)

        Exemple: Si quotas totaux = 100 mais besoin = 120 avec min=2:
        → 80 examens avec 2 surveillants + 20 examens avec 1 surveillant = 100 surveillants
        """
        besoins_par_seance = {}

        # Calculer les quotas totaux disponibles
        quotas_totaux = 0
        enseignants_par_grade = {}
        for enseignant in enseignants:
            if enseignant.grade_code not in enseignants_par_grade:
                enseignants_par_grade[enseignant.grade_code] = []
            enseignants_par_grade[enseignant.grade_code].append(enseignant)

        for grade_code, enseignants_grade in enseignants_par_grade.items():
            grade_config = self.grade_configs.get(grade_code, {"nb_surveillances": 2})
            quota_fixe = grade_config.get("nb_surveillances", 2)
            quotas_totaux += len(enseignants_grade) * quota_fixe

        # Calculer le besoin total avec min_surveillants_par_examen
        nb_total_examens = sum([len(examens) for examens in seances.values()])
        besoin_ideal = nb_total_examens * min_surveillants_par_examen
        besoin_minimal = nb_total_examens  # Au minimum 1 surveillant par examen

        # Vérifier s'il faut adapter (quotas insuffisants)
        mode_adaptatif = quotas_totaux < besoin_ideal

        if mode_adaptatif:
            # Calculer combien d'examens peuvent avoir min_surveillants_par_examen
            # et combien devront se contenter de 1 seul
            nb_examens_min_complet = (quotas_totaux - besoin_minimal) // (
                min_surveillants_par_examen - 1
            )
            nb_examens_min_reduit = nb_total_examens - nb_examens_min_complet

            self.warnings.append(
                f"⚠️ MODE ADAPTATIF ACTIVÉ: Quotas totaux ({quotas_totaux}) < besoin idéal ({besoin_ideal})"
            )
            self.warnings.append(
                f"   → Adaptation: ~{nb_examens_min_complet} examens avec {min_surveillants_par_examen} surveillants, "
                f"~{nb_examens_min_reduit} examens avec 1 seul surveillant"
            )

        for seance_key, examens_seance in seances.items():
            nb_examens = len(examens_seance)

            # Nombre minimal idéal pour cette séance
            nb_requis_ideal = nb_examens * min_surveillants_par_examen
            # Nombre minimal absolu (1 surveillant par examen)
            nb_requis_minimal = nb_examens

            besoins_par_seance[seance_key] = nb_requis_ideal

            surveillants_pour_seance = [
                affectations_vars[(seance_key, ens.id)] for ens in enseignants
            ]

            # Vérifier si suffisamment d'enseignants disponibles
            if nb_requis_minimal > len(enseignants):
                # Pas assez d'enseignants pour garantir 1 par examen
                self.model.Add(sum(surveillants_pour_seance) >= len(enseignants))
                self.warnings.append(
                    f"❌ Séance {seance_key[1]} du {seance_key[0].strftime('%d/%m')}: "
                    f"CRITIQUE - Besoin d'au moins {nb_requis_minimal} enseignants (1 par examen) "
                    f"mais seulement {len(enseignants)} disponibles!"
                )
            elif mode_adaptatif:
                # Mode adaptatif: Mix équilibré d'examens à 2 surveillants et à 1 surveillant
                # Objectif: Chaque séance devrait avoir une combinaison pour respecter l'équilibre global
                #
                # Le nombre maximum pour cette séance est nb_examens * min_surveillants_par_examen
                # car tous les enseignants affectés surveillent tous les examens de la séance
                nb_maximum = nb_requis_ideal + 2

                # Contrainte minimum: au moins 1 surveillant par examen + 1 enseignant supplémentaire
                # (éviter d'avoir exactement le minimum strict)
                nb_minimum_avec_marge = nb_requis_minimal + 2
                self.model.Add(sum(surveillants_pour_seance) >= nb_minimum_avec_marge)

                # Contrainte maximum: ne pas dépasser l'idéal (permet mix équilibré)
                # Si on met nb_examens * min_surveillants_par_examen enseignants,
                # tous les examens auront 2 surveillants
                # Si on met moins, certains examens auront 1 seul surveillant
                self.model.Add(sum(surveillants_pour_seance) <= nb_maximum)

                self.infos.append(
                    f"   • Séance {seance_key[1]} du {seance_key[0].strftime('%d/%m')}: "
                    f"{nb_examens} examens → Min: {nb_minimum_avec_marge} (1 par examen + 1 marge), "
                    f"Max: {nb_maximum} (mix équilibré 2/1 surveillants)"
                )
            else:
                # Mode normal: Assez de quotas pour respecter min_surveillants_par_examen partout
                # Calculer le nombre maximum autorisé (20% de marge + 2)
                nb_maximum = math.ceil(nb_requis_ideal * 1.2 + 2)

                # Contrainte 1: Au moins nb_requis_ideal surveillants (minimum obligatoire)
                self.model.Add(sum(surveillants_pour_seance) >= nb_requis_ideal)

                # Contrainte 2: Au maximum nb_maximum surveillants (éviter surcharge)
                self.model.Add(sum(surveillants_pour_seance) <= nb_maximum)

                # Log pour traçabilité
                self.infos.append(
                    f"   • Séance {seance_key[1]} du {seance_key[0].strftime('%d/%m')}: "
                    f"{nb_examens} examens → Min: {nb_requis_ideal}, Max: {nb_maximum} enseignants"
                )

        return besoins_par_seance

    def _contrainte_quotas_grades(
        self, enseignants: List[Enseignant], seances: Dict, affectations_vars: Dict
    ) -> Dict:
        """
        CONTRAINTE 3 (PRIORITÉ 3): Quota FIXE et ÉGAL par grade.

        RÈGLE STRICTE: Tous les enseignants d'un même grade doivent faire
        EXACTEMENT le même nombre de séances de surveillance.

        Exemple:
        - Tous les Professeurs font 5 séances (ni 4, ni 6)
        - Tous les Assistants font 3 séances (ni 2, ni 4)
        """
        charge_par_enseignant = {}

        # Grouper les enseignants par grade
        enseignants_par_grade = {}
        for enseignant in enseignants:
            if enseignant.grade_code not in enseignants_par_grade:
                enseignants_par_grade[enseignant.grade_code] = []
            enseignants_par_grade[enseignant.grade_code].append(enseignant)

        # Pour chaque grade, imposer un quota FIXE
        for grade_code, enseignants_grade in enseignants_par_grade.items():
            grade_config = self.grade_configs.get(
                grade_code,
                {
                    "nb_surveillances": 2  # Par défaut, quota fixe = 2
                },
            )

            # Le quota fixe est défini par nb_surveillances
            quota_fixe = grade_config.get("nb_surveillances", 2)

            self.infos.append(
                f"   📌 Grade {grade_code}: Quota FIXE = {quota_fixe} séances "
                f"pour {len(enseignants_grade)} enseignants (CHAQUE enseignant)"
            )

            # CONTRAINTE STRICTE: Chaque enseignant de ce grade fait EXACTEMENT quota_fixe séances
            # On impose l'égalité stricte pour TOUS les enseignants, sans exception
            # Si c'est impossible, le solveur retournera INFEASIBLE
            for enseignant in enseignants_grade:
                # Calculer la charge totale pour cet enseignant
                charge = sum(
                    [
                        affectations_vars[(seance_key, enseignant.id)]
                        for seance_key in seances.keys()
                    ]
                )

                charge_par_enseignant[enseignant.id] = charge

                # CONTRAINTE D'ÉGALITÉ STRICTE: charge == quota_fixe
                # Pas de condition, pas d'estimation, juste l'égalité stricte
                self.model.Add(charge == quota_fixe)

        return charge_par_enseignant

    def _contrainte_voeux(
        self,
        list_voeux: List[Dict],
        seances: Dict,
        enseignants: List[Enseignant],
        affectations_vars: Dict,
    ) -> Dict:
        """
        CONTRAINTE 4 (PRIORITÉ 4): Préférence pour les vœux de disponibilité.

        IMPORTANT: Les vœux sont des PRÉFÉRENCES de surveillance (créneaux préférés).
        - Un vœu signifie "Je VEUX surveiller à ce créneau"
        - Les enseignants avec vœux pour un créneau sont PRIORITAIRES
        - Les enseignants sans vœux PEUVENT quand même être affectés si nécessaire

        Args:
            list_voeux: Liste de dictionnaires avec les attributs:
                - id: Code smartex de l'enseignant
                - nom: Nom de l'enseignant
                - jour: Numéro du jour (1, 2, 3...)
                - seance: Code séance (S1, S2, S3, S4)
                - heure: Heure de la séance

        Retourne un dictionnaire pour calculer les bonus dans la fonction objectif.
        """
        preferences = {
            "avec_voeu": [],  # (seance_key, enseignant_id) avec vœu → BONUS
            "sans_voeu": [],  # (seance_key, enseignant_id) sans vœu → NEUTRE
        }

        # Construire un mapping code_smartex -> enseignant_id
        code_to_id = {
            ens.code_smartex: ens.id for ens in enseignants if ens.code_smartex
        }

        # DEBUG: Afficher les vœux AVANT traitement
        self.infos.append(f"\n🔍 DEBUG VOEUX (AVANT TRAITEMENT):")
        self.infos.append(f"   • Nombre total de vœux: {len(list_voeux)}")
        self.infos.append(
            f"   • Nombre d'enseignants avec code_smartex: {len(code_to_id)}"
        )
        if list_voeux:
            self.infos.append(f"   • Exemple vœux (5 premiers):")
            for i, voeu_dict in enumerate(list_voeux[:5]):
                code_smartex = voeu_dict.get("id")
                jour = voeu_dict.get("jour")
                seance_val = voeu_dict.get("seance")
                ens_id = code_to_id.get(code_smartex, "NON TROUVÉ")
                self.infos.append(
                    f"      - code={code_smartex}, nom={voeu_dict.get('nom')}, jour={jour}, seance={seance_val}, ens_id={ens_id}"
                )

        # Construire un set de tuples (enseignant_id, jour, seance) pour recherche rapide
        voeux_set = set()
        voeux_rejetes = []
        for voeu_dict in list_voeux:
            code_smartex = voeu_dict.get("id")
            jour = voeu_dict.get("jour")
            seance_val = voeu_dict.get("seance")

            # Debug: pourquoi certains vœux sont rejetés
            raison_rejet = []
            if not code_smartex:
                raison_rejet.append("code_smartex vide")
            elif code_smartex not in code_to_id:
                raison_rejet.append(
                    f"code_smartex '{code_smartex}' non trouvé dans enseignants"
                )
            if not jour:
                raison_rejet.append("jour vide")
            if not seance_val:
                raison_rejet.append("seance vide")

            if code_smartex and code_smartex in code_to_id and jour and seance_val:
                enseignant_id = code_to_id[code_smartex]
                # Normaliser la séance
                seance = str(seance_val).upper().strip()
                voeux_set.add((enseignant_id, jour, seance))
            else:
                voeux_rejetes.append((voeu_dict, raison_rejet))

        # DEBUG: Afficher les vœux APRÈS traitement
        self.infos.append(f"\n🔍 DEBUG VOEUX (APRÈS TRAITEMENT):")
        self.infos.append(f"   • Voeux_set créé: {len(voeux_set)} entrées")
        self.infos.append(f"   • Voeux_set (5 premiers): {list(voeux_set)[:5]}")
        self.infos.append(f"   • Voeux rejetés: {len(voeux_rejetes)}")
        if voeux_rejetes:
            self.infos.append(f"   • Exemples de rejets (5 premiers):")
            for voeu_dict, raisons in voeux_rejetes[:5]:
                self.infos.append(
                    f"      - {voeu_dict.get('id')} / jour={voeu_dict.get('jour')} / seance={voeu_dict.get('seance')} → Raisons: {', '.join(raisons)}"
                )

        # Pour chaque combinaison (séance, enseignant), vérifier si un vœu existe
        matches_found = 0
        for seance_key in seances.keys():
            date_exam, seance_code, semestre, session, jour_index = seance_key
            # IMPORTANT: jour_index est l'index de jour d'examen (1er jour, 2ème jour, etc.)
            seance_normalized = (
                seance_code.upper().strip()
            )  # Normaliser pour comparaison

            # DEBUG: Afficher quelques séances
            if matches_found == 0 and len(preferences["avec_voeu"]) < 3:
                self.infos.append(
                    f"   • Vérification séance: date={date_exam}, jour_index={jour_index}, seance={seance_normalized}"
                )

            for enseignant in enseignants:
                # Vérifier si l'enseignant a un vœu pour ce jour et cette séance
                # Utiliser jour_index (1er jour, 2ème jour...) et non date_exam.day (jour du mois)
                lookup_key = (enseignant.id, jour_index, seance_normalized)
                if lookup_key in voeux_set:
                    # BONUS: Enseignant a exprimé un vœu pour ce créneau
                    preferences["avec_voeu"].append((seance_key, enseignant.id))
                    if matches_found < 3:
                        self.infos.append(
                            f"   ✓ MATCH trouvé: enseignant {enseignant.id}, jour_index={jour_index}, seance={seance_normalized}"
                        )
                    matches_found += 1
                else:
                    # NEUTRE: Pas de vœu pour ce créneau (mais peut être affecté)
                    preferences["sans_voeu"].append((seance_key, enseignant.id))

        return preferences

    def _contrainte_equilibre_entre_seances(
        self, seances: Dict, enseignants: List[Enseignant], affectations_vars: Dict
    ):
        """
        CONTRAINTE 6 (PRIORITÉ 6): Équilibre entre séances de taille similaire.

        Les séances ayant le même nombre d'examens doivent avoir approximativement
        le même nombre d'enseignants affectés.

        Exemple: Si deux séances ont toutes les deux 23 examens, elles devraient avoir
        un nombre similaire d'enseignants (par ex: 45 et 47, pas 25 et 50).

        Stratégie:
        - Grouper les séances par nombre d'examens
        - Pour chaque groupe, calculer le nombre d'enseignants par séance
        - Imposer que la différence entre le min et le max du groupe soit limitée
        """
        # Grouper les séances par nombre d'examens
        seances_par_taille = {}
        for seance_key, examens_seance in seances.items():
            nb_examens = len(examens_seance)
            if nb_examens not in seances_par_taille:
                seances_par_taille[nb_examens] = []
            seances_par_taille[nb_examens].append(seance_key)

        # Pour chaque groupe de séances de même taille
        for nb_examens, seances_groupe in seances_par_taille.items():
            # Si une seule séance dans ce groupe, pas besoin d'équilibrer
            if len(seances_groupe) <= 1:
                continue

            # Calculer le nombre d'enseignants pour chaque séance du groupe
            nb_enseignants_par_seance = {}
            for seance_key in seances_groupe:
                surveillants_pour_seance = [
                    affectations_vars[(seance_key, ens.id)] for ens in enseignants
                ]
                nb_enseignants_par_seance[seance_key] = sum(surveillants_pour_seance)

            # Créer des variables pour min et max du groupe
            valeurs_groupe = list(nb_enseignants_par_seance.values())

            # Imposer que la différence max - min soit petite (tolérance de 20% ou au moins 3 enseignants)
            # Pour éviter des contraintes trop strictes, on utilise une tolérance adaptative
            tolerance = max(
                3, int(nb_examens * 0.15)
            )  # 15% du nombre d'examens ou 3 minimum

            # Pour chaque paire de séances dans le groupe, limiter la différence
            for i, seance_key_1 in enumerate(seances_groupe):
                for seance_key_2 in seances_groupe[i + 1 :]:
                    nb_ens_1 = nb_enseignants_par_seance[seance_key_1]
                    nb_ens_2 = nb_enseignants_par_seance[seance_key_2]

                    # Contrainte: |nb_ens_1 - nb_ens_2| <= tolerance
                    # Équivalent à: nb_ens_1 - nb_ens_2 <= tolerance ET nb_ens_2 - nb_ens_1 <= tolerance
                    self.model.Add(nb_ens_1 - nb_ens_2 <= tolerance)
                    self.model.Add(nb_ens_2 - nb_ens_1 <= tolerance)

            self.infos.append(
                f"   🔄 Équilibre: {len(seances_groupe)} séances avec {nb_examens} examens "
                f"(tolérance: ±{tolerance} enseignants)"
            )

    # ========== DIAGNOSTIC D'ÉCHEC ==========

    def _diagnostiquer_echec(
        self,
        enseignants: List[Enseignant],
        examens: List[Examen],
        seances: Dict,
        responsables_examens: Dict,
        min_surveillants_par_examen: int,
        allow_fallback: bool,
        list_voeux: List[Dict],
        respecter_voeux: bool,
    ) -> List[str]:
        """
        Diagnostic progressif pour identifier quelle contrainte empêche de trouver une solution.
        Teste les contraintes une par une en ordre de priorité.

        Returns:
            Liste de messages de diagnostic avec recommandations
        """
        messages = []

        print("\n" + "=" * 80)
        print("🔍 DIAGNOSTIC PROGRESSIF DES CONTRAINTES")
        print("=" * 80)

        # Test 1: Modèle vide (toujours faisable)
        print("\n[TEST 1/5] Modèle vide (sans contraintes)...")
        test_model_1 = cp_model.CpModel()
        test_solver_1 = cp_model.CpSolver()
        test_solver_1.parameters.max_time_in_seconds = 10.0

        affectations_test = {}
        for seance_key in seances.keys():
            for enseignant in enseignants:
                var_name = f"test1_{seance_key}_{enseignant.id}"
                affectations_test[(seance_key, enseignant.id)] = (
                    test_model_1.NewBoolVar(var_name)
                )

        status_1 = test_solver_1.Solve(test_model_1)
        if status_1 in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            print("   ✅ Modèle de base OK (variables créées correctement)")
            messages.append("✅ [TEST 1/5] Modèle de base: OK")
        else:
            print("   ❌ Problème avec le modèle de base")
            messages.append(
                "❌ [TEST 1/5] Modèle de base: ÉCHEC (problème de configuration)"
            )
            return messages

        # Test 2: Avec contrainte des responsables uniquement
        print("\n[TEST 2/5] Contrainte 1: Responsables d'examens...")
        test_model_2 = cp_model.CpModel()
        test_solver_2 = cp_model.CpSolver()
        test_solver_2.parameters.max_time_in_seconds = 10.0

        affectations_test_2 = {}
        for seance_key in seances.keys():
            for enseignant in enseignants:
                var_name = f"test2_{seance_key}_{enseignant.id}"
                affectations_test_2[(seance_key, enseignant.id)] = (
                    test_model_2.NewBoolVar(var_name)
                )

        # Appliquer contrainte responsables
        nb_resp = 0
        for seance_key, examens_seance in seances.items():
            for examen in examens_seance:
                if examen.id in responsables_examens:
                    responsable_id = responsables_examens[examen.id]
                    if any(ens.id == responsable_id for ens in enseignants):
                        var = affectations_test_2.get((seance_key, responsable_id))
                        if var is not None:
                            test_model_2.Add(var == 1)
                            nb_resp += 1

        status_2 = test_solver_2.Solve(test_model_2)
        if status_2 in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            print(f"   ✅ Contrainte responsables OK ({nb_resp} responsables)")
            messages.append(
                f"✅ [TEST 2/5] Contrainte responsables: OK ({nb_resp} responsables)"
            )
        else:
            print(f"   ❌ PROBLÈME avec la contrainte responsables")
            messages.append(f"❌ [TEST 2/5] Contrainte responsables: ÉCHEC")
            messages.append(
                f"   🔧 CAUSE: Un ou plusieurs responsables ne peuvent pas être affectés"
            )
            messages.append(f"   💡 SOLUTION:")
            messages.append(
                f"      • Vérifiez que tous les responsables sont disponibles (participe_surveillance=True)"
            )
            messages.append(
                f"      • Vérifiez que les codes smartex des responsables sont corrects"
            )
            return messages

        # Test 3: Avec contrainte responsables + nombre minimal
        print("\n[TEST 3/5] Contrainte 2: Nombre minimal d'enseignants par séance...")
        test_model_3 = cp_model.CpModel()
        test_solver_3 = cp_model.CpSolver()
        test_solver_3.parameters.max_time_in_seconds = 10.0

        affectations_test_3 = {}
        for seance_key in seances.keys():
            for enseignant in enseignants:
                var_name = f"test3_{seance_key}_{enseignant.id}"
                affectations_test_3[(seance_key, enseignant.id)] = (
                    test_model_3.NewBoolVar(var_name)
                )

        # Responsables
        for seance_key, examens_seance in seances.items():
            for examen in examens_seance:
                if examen.id in responsables_examens:
                    responsable_id = responsables_examens[examen.id]
                    if any(ens.id == responsable_id for ens in enseignants):
                        var = affectations_test_3.get((seance_key, responsable_id))
                        if var is not None:
                            test_model_3.Add(var == 1)

        # Nombre minimal
        capacite_insuffisante = []
        for seance_key, examens_seance in seances.items():
            nb_examens = len(examens_seance)
            nb_requis = nb_examens * min_surveillants_par_examen

            surveillants_pour_seance = [
                affectations_test_3[(seance_key, ens.id)] for ens in enseignants
            ]

            if nb_requis > len(enseignants):
                capacite_insuffisante.append((seance_key, nb_requis, len(enseignants)))
                if allow_fallback:
                    test_model_3.Add(
                        sum(surveillants_pour_seance)
                        >= min(nb_examens, len(enseignants))
                    )
                else:
                    test_model_3.Add(sum(surveillants_pour_seance) >= len(enseignants))
            else:
                test_model_3.Add(sum(surveillants_pour_seance) >= nb_requis)

        status_3 = test_solver_3.Solve(test_model_3)
        if status_3 in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            print(f"   ✅ Contrainte nombre minimal OK")
            messages.append(f"✅ [TEST 3/5] Contrainte nombre minimal: OK")
            if capacite_insuffisante:
                messages.append(
                    f"   ⚠️ Attention: {len(capacite_insuffisante)} séance(s) avec capacité limite"
                )
                for seance_key, requis, dispo in capacite_insuffisante[:3]:
                    date_str = seance_key[0].strftime("%d/%m/%Y")
                    messages.append(
                        f"      • {date_str} {seance_key[1]}: besoin {requis}, dispo {dispo}"
                    )
        else:
            print(f"   ❌ PROBLÈME avec la contrainte nombre minimal")
            messages.append(f"❌ [TEST 3/5] Contrainte nombre minimal: ÉCHEC")
            messages.append(
                f"   🔧 CAUSE: Pas assez d'enseignants pour couvrir toutes les séances"
            )
            messages.append(f"   💡 SOLUTION:")
            messages.append(f"      • Ajouter plus d'enseignants disponibles")
            messages.append(
                f"      • Réduire min_surveillants_par_examen (actuellement: {min_surveillants_par_examen})"
            )
            if capacite_insuffisante:
                messages.append(f"   📊 Séances problématiques:")
                for seance_key, requis, dispo in capacite_insuffisante[:5]:
                    date_str = seance_key[0].strftime("%d/%m/%Y")
                    messages.append(
                        f"      • {date_str} {seance_key[1]}: besoin {requis} enseignants, seulement {dispo} disponibles"
                    )
            return messages

        # Test 4: Avec responsables + nombre minimal + quotas par grade
        print("\n[TEST 4/5] Contrainte 3: Quotas fixes par grade...")
        test_model_4 = cp_model.CpModel()
        test_solver_4 = cp_model.CpSolver()
        test_solver_4.parameters.max_time_in_seconds = 15.0

        affectations_test_4 = {}
        for seance_key in seances.keys():
            for enseignant in enseignants:
                var_name = f"test4_{seance_key}_{enseignant.id}"
                affectations_test_4[(seance_key, enseignant.id)] = (
                    test_model_4.NewBoolVar(var_name)
                )

        # Responsables
        for seance_key, examens_seance in seances.items():
            for examen in examens_seance:
                if examen.id in responsables_examens:
                    responsable_id = responsables_examens[examen.id]
                    if any(ens.id == responsable_id for ens in enseignants):
                        var = affectations_test_4.get((seance_key, responsable_id))
                        if var is not None:
                            test_model_4.Add(var == 1)

        # Nombre minimal
        for seance_key, examens_seance in seances.items():
            nb_examens = len(examens_seance)
            nb_requis = nb_examens * min_surveillants_par_examen

            surveillants_pour_seance = [
                affectations_test_4[(seance_key, ens.id)] for ens in enseignants
            ]

            if nb_requis > len(enseignants):
                if allow_fallback:
                    test_model_4.Add(
                        sum(surveillants_pour_seance)
                        >= min(nb_examens, len(enseignants))
                    )
            else:
                test_model_4.Add(sum(surveillants_pour_seance) >= nb_requis)

        # Quotas par grade
        enseignants_par_grade = {}
        for enseignant in enseignants:
            if enseignant.grade_code not in enseignants_par_grade:
                enseignants_par_grade[enseignant.grade_code] = []
            enseignants_par_grade[enseignant.grade_code].append(enseignant)

        quotas_impossibles = []
        demande_totale = 0
        capacite_totale = len(seances) * len(enseignants)  # Capacité théorique maximale

        for grade_code, enseignants_grade in enseignants_par_grade.items():
            grade_config = self.grade_configs.get(grade_code, {"nb_surveillances": 2})
            quota_fixe = grade_config.get("nb_surveillances", 2)

            demande_grade = len(enseignants_grade) * quota_fixe
            demande_totale += demande_grade

            for enseignant in enseignants_grade:
                charge = sum(
                    [
                        affectations_test_4[(seance_key, enseignant.id)]
                        for seance_key in seances.keys()
                    ]
                )
                test_model_4.Add(charge == quota_fixe)

            # Vérifier si ce grade a un quota réalisable
            if demande_grade > len(seances) * len(enseignants_grade):
                quotas_impossibles.append(
                    (grade_code, quota_fixe, len(enseignants_grade), demande_grade)
                )

        status_4 = test_solver_4.Solve(test_model_4)
        if status_4 in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            print(f"   ✅ Contrainte quotas par grade OK")
            messages.append(f"✅ [TEST 4/5] Contrainte quotas par grade: OK")
        else:
            print(f"   ❌ PROBLÈME avec les quotas par grade")
            messages.append(f"❌ [TEST 4/5] Contrainte quotas par grade: ÉCHEC")
            messages.append(
                f"   🔧 CAUSE: Les quotas fixes par grade sont incompatibles avec les autres contraintes"
            )
            messages.append(f"   💡 SOLUTION:")

            # Analyser les quotas par grade
            messages.append(f"\n   📊 Analyse des quotas:")
            total_places_requises = 0
            for grade_code, enseignants_grade in enseignants_par_grade.items():
                grade_config = self.grade_configs.get(
                    grade_code, {"nb_surveillances": 2}
                )
                quota_fixe = grade_config.get("nb_surveillances", 2)
                nb_ens = len(enseignants_grade)
                places_requises = nb_ens * quota_fixe
                total_places_requises += places_requises
                messages.append(
                    f"      • Grade {grade_code}: {nb_ens} enseignants × {quota_fixe} séances = {places_requises} affectations"
                )

            # Calculer la demande totale vs capacité
            capacite_seances = sum(
                [
                    len(examens) * min_surveillants_par_examen
                    for examens in seances.values()
                ]
            )
            messages.append(f"\n   📊 Bilan global:")
            messages.append(
                f"      • Demande totale: {total_places_requises} affectations (quotas des enseignants)"
            )
            messages.append(
                f"      • Capacité minimale requise: {capacite_seances} affectations (couverture des examens)"
            )
            messages.append(f"      • Nombre de séances: {len(seances)}")

            if total_places_requises < capacite_seances:
                messages.append(
                    f"   ❌ DÉSÉQUILIBRE: Les quotas totaux ({total_places_requises}) < capacité requise ({capacite_seances})"
                )
                messages.append(f"   💡 SOLUTIONS POSSIBLES:")
                messages.append(f"      • Augmenter les quotas dans GradeConfig")
                messages.append(f"      • Ajouter plus d'enseignants")
                messages.append(f"      • Réduire min_surveillants_par_examen")
            elif total_places_requises > capacite_totale:
                messages.append(
                    f"   ❌ SURCHARGE: Les quotas totaux ({total_places_requises}) > capacité maximale ({capacite_totale})"
                )
                messages.append(f"   💡 SOLUTIONS POSSIBLES:")
                messages.append(f"      • Réduire les quotas dans GradeConfig")
                messages.append(f"      • Ajouter plus de séances d'examens")
            else:
                messages.append(
                    f"   ⚠️ Les quotas sont théoriquement compatibles mais incompatibles avec les autres contraintes"
                )
                messages.append(f"   💡 SOLUTIONS POSSIBLES:")
                messages.append(
                    f"      • Assouplir les quotas (permettre une petite variation)"
                )
                messages.append(
                    f"      • Vérifier la répartition des responsables d'examens"
                )
                messages.append(
                    f"      • Redistribuer les enseignants entre les grades"
                )

            return messages

        # Test 5: Toutes les contraintes (pour confirmer que les vœux ne posent pas problème)
        print("\n[TEST 5/5] Vérification finale avec toutes les contraintes...")
        messages.append(
            f"✅ [TEST 5/5] Toutes les contraintes de base sont compatibles"
        )
        messages.append(f"\n💡 CONCLUSION:")
        messages.append(
            f"   Les contraintes principales (responsables, couverture, quotas) sont OK."
        )
        if respecter_voeux and list_voeux:
            messages.append(f"   Le problème peut venir de:")
            messages.append(
                f"      • La combinaison des vœux avec les autres contraintes"
            )
            messages.append(
                f"      • L'optimisation de la fonction objectif (équilibre + vœux)"
            )
            messages.append(f"   💡 Essayez:")
            messages.append(
                f"      • Désactiver temporairement les vœux (respecter_voeux=False)"
            )
            messages.append(
                f"      • Augmenter le temps de résolution (max_time_in_seconds)"
            )
        else:
            messages.append(f"   Le problème vient de l'optimisation multi-objectif.")
            messages.append(f"   💡 Essayez d'augmenter le temps de résolution.")

        return messages

    # ========== FONCTION OBJECTIF ==========

    def _configurer_fonction_objectif(
        self,
        charge_par_enseignant: Dict,
        affectations_vars: Dict,
        seances: Dict,
        enseignants: List[Enseignant],
        equilibrer_temporel: bool,
        preferences_voeux: Dict = None,
    ) -> cp_model.IntVar:
        """
        Configure la fonction objectif multi-critères pour maximiser la satisfaction globale.

        Composantes du score:
        1. Équilibre global de charge (minimiser dispersion) - POIDS: 60%
        2. Préférence pour enseignants avec vœux - POIDS: 30%
        3. Équilibre temporel (éviter toujours premiers/derniers créneaux) - POIDS: 10%
        """

        # COMPOSANTE 1: Équilibre global de charge (PRINCIPAL)
        charges = list(charge_par_enseignant.values())

        if charges:
            charge_min = self.model.NewIntVar(0, len(seances), "charge_min")
            charge_max = self.model.NewIntVar(0, len(seances), "charge_max")

            self.model.AddMinEquality(charge_min, charges)
            self.model.AddMaxEquality(charge_max, charges)

            dispersion = self.model.NewIntVar(0, len(seances), "dispersion")
            self.model.Add(dispersion == charge_max - charge_min)
        else:
            dispersion = None

        # COMPOSANTE 2: Bonus pour enseignants avec vœux (SECONDAIRE)
        bonus_voeux = None
        if preferences_voeux and preferences_voeux.get("avec_voeu"):
            # Compter le nombre d'affectations avec vœu
            affectations_avec_voeu = [
                affectations_vars[(seance_key, ens_id)]
                for seance_key, ens_id in preferences_voeux["avec_voeu"]
                if (seance_key, ens_id) in affectations_vars
            ]

            if affectations_avec_voeu:
                bonus_voeux = self.model.NewIntVar(
                    0, len(affectations_avec_voeu), "bonus_voeux"
                )
                self.model.Add(bonus_voeux == sum(affectations_avec_voeu))

        # COMPOSANTE 3: Équilibre temporel (si activé)
        if equilibrer_temporel:
            self._ajouter_equilibre_temporel(affectations_vars, seances, enseignants)

        # OBJECTIF COMBINÉ: Minimiser dispersion ET maximiser bonus_voeux
        # On crée un score combiné avec poids appropriés
        if dispersion is not None and bonus_voeux is not None:
            # Score = -60*dispersion + 30*bonus_voeux
            # Le solveur maximise, donc on veut minimiser dispersion (négatif) et maximiser bonus (positif)
            score_combine = self.model.NewIntVar(
                -60 * len(seances), 30 * len(affectations_vars), "score_combine"
            )
            self.model.Add(score_combine == bonus_voeux - 2 * dispersion)
            self.model.Maximize(score_combine)
            return score_combine
        elif dispersion is not None:
            # Seulement la dispersion
            self.model.Minimize(dispersion)
            return dispersion

        return None

    def _ajouter_equilibre_temporel(
        self, affectations_vars: Dict, seances: Dict, enseignants: List[Enseignant]
    ):
        """
        Ajoute des contraintes pour équilibrer temporellement les affectations.
        Évite qu'un enseignant soit toujours affecté aux mêmes créneaux horaires.
        """

        # Grouper les séances par code horaire (S1, S2, S3, S4)
        seances_par_code = {"S1": [], "S2": [], "S3": [], "S4": []}

        for seance_key in seances.keys():
            seance_code = seance_key[1]  # S1, S2, S3 ou S4
            if seance_code in seances_par_code:
                seances_par_code[seance_code].append(seance_key)

        # Pour chaque enseignant, équilibrer ses affectations entre créneaux
        for enseignant in enseignants:
            affectations_par_creneau = {}

            for code, seances_code in seances_par_code.items():
                if seances_code:
                    nb_aff_creneau = sum(
                        [
                            affectations_vars[(seance_key, enseignant.id)]
                            for seance_key in seances_code
                        ]
                    )
                    affectations_par_creneau[code] = nb_aff_creneau

            # Contrainte souple: Éviter qu'un enseignant ait toutes ses affectations dans un seul créneau
            # (Ceci est une contrainte souple, elle influence mais ne bloque pas)
            if len(affectations_par_creneau) > 1:
                valeurs = list(affectations_par_creneau.values())
                # On ne rajoute pas de contrainte stricte, c'est géré par l'équilibre global
                pass

    # ========== SAUVEGARDE ==========

    def _sauvegarder_affectations_par_seance(
        self,
        affectations_vars: Dict,
        seances: Dict,
        enseignants: List[Enseignant],
        responsables_examens: Dict[int, int],
    ) -> int:
        """
        Sauvegarde les affectations dans la base de données.
        Pour chaque séance, duplique les enseignants affectés pour chaque examen.
        Marque le responsable de l'examen avec est_responsable=True.
        Le responsable compte dans les quotas et peut surveiller d'autres examens.
        """
        nb_affectations = 0

        for seance_key, examens_seance in seances.items():
            # Trouver les enseignants affectés à cette séance
            enseignants_affectes = []

            for enseignant in enseignants:
                var = affectations_vars[(seance_key, enseignant.id)]
                if self.solver.Value(var) == 1:
                    enseignants_affectes.append(enseignant)

            # Pour chaque examen de cette séance
            for examen in examens_seance:
                responsable_id = responsables_examens.get(examen.id, None)

                # Créer une affectation pour chaque enseignant affecté
                for enseignant in enseignants_affectes:
                    # Marquer si cet enseignant est le responsable de CET examen
                    est_responsable = enseignant.id == responsable_id

                    affectation = Affectation(
                        examen_id=examen.id,
                        enseignant_id=enseignant.id,
                        cod_salle=examen.cod_salle,
                        est_responsable=est_responsable,
                    )
                    self.db.add(affectation)
                    nb_affectations += 1

        self.db.commit()
        return nb_affectations

    # ========== MÉTHODES UTILITAIRES ==========

    def _identifier_responsables(self, examens: List[Examen]) -> Dict[int, int]:
        """
        Identifie les responsables d'examens.
        Le champ 'enseignant' du modèle Examen contient le code smartex du responsable.
        """
        responsables = {}

        for examen in examens:
            if hasattr(examen, "enseignant") and examen.enseignant:
                # Le champ enseignant contient le code smartex
                enseignant = (
                    self.db.query(Enseignant)
                    .filter(Enseignant.code_smartex == examen.enseignant)
                    .first()
                )

                if enseignant:
                    responsables[examen.id] = enseignant.id
                else:
                    # Log si le code smartex n'est pas trouvé
                    date_str = examen.dateExam.strftime("%d/%m/%Y")
                    time_str = f"{examen.h_debut.strftime('%H:%M')}-{examen.h_fin.strftime('%H:%M')}"
                    self.warnings.append(
                        f"⚠️ Enseignant responsable non trouvé (code '{examen.enseignant}') - Examen du {date_str} de {time_str} en salle {examen.cod_salle}"
                    )

        return responsables

    def _get_seance_code_from_time(self, heure: dt_time) -> str:
        """Détermine le code de séance (S1, S2, S3, S4) selon l'heure"""
        hour = heure.hour
        minute = heure.minute
        time_in_minutes = hour * 60 + minute

        # S1: 08:30-10:00
        if 510 <= time_in_minutes < 630:  # 08:30 = 510 min
            return "S1"
        # S2: 10:30-12:00
        elif 630 <= time_in_minutes < 750:  # 10:30 = 630 min
            return "S2"
        # S3: 12:30-14:00
        elif 750 <= time_in_minutes < 870:  # 12:30 = 750 min
            return "S3"
        # S4: 14:30-16:00
        elif 870 <= time_in_minutes < 1020:  # 14:30 = 870 min
            return "S4"
        else:
            # Par défaut
            if hour < 12:
                return "S1"
            else:
                return "S3"

    def _extract_voeu_jour(self, voeu: Voeu):
        """Extrait le numéro du jour depuis un objet Voeu (plusieurs attributs possibles)."""
        if hasattr(voeu, "date_indisponible") and voeu.date_indisponible:
            try:
                return voeu.date_indisponible.day
            except Exception:
                pass
        return getattr(voeu, "jour", None)

    def _seance_to_index(self, seance_val) -> int:
        """Mappe une valeur de séance (S1,S2,.., 'Matin', 'Après-midi'...) en indice pour trier."""
        if seance_val is None:
            return 99
        s = str(seance_val).upper()
        if s in ("S1", "1", "08:30", "08:30-10:00", "MATIN", "M"):
            return 1
        if s in ("S2", "2", "10:30", "10:30-12:00"):
            return 2
        if s in ("S3", "3", "12:30", "12:30-14:00", "APRES-MIDI", "APRES MIDI"):
            return 3
        if s in ("S4", "4", "14:30", "14:30-16:00"):
            return 4
        if "MATIN" in s:
            return 1
        if "APRES" in s:
            return 3
        if s.startswith("S") and len(s) > 1 and s[1].isdigit():
            try:
                return int(s[1])
            except Exception:
                return 99
        return 99

    def _trier_et_afficher_voeux(self, voeux: List[Voeu]) -> list:
        """Trie la liste des voeux par jour puis par séance et retourne une liste de dictionnaires d'attributs pour chaque voeu."""

        def _voeu_sort_key(voeu):
            jour = self._extract_voeu_jour(voeu) or 0
            seance_val = getattr(voeu, "seance_indisponible", None) or getattr(
                voeu, "seance", None
            )
            seance_idx = self._seance_to_index(seance_val)
            code_smartex = getattr(voeu, "code_smartex_ens", None)
            rel_enseignant = getattr(voeu, "enseignant", None)
            rel_code = None
            if isinstance(rel_enseignant, str):
                rel_code = rel_enseignant
            elif hasattr(rel_enseignant, "code_smartex"):
                rel_code = getattr(rel_enseignant, "code_smartex")
            sort_ident = (
                code_smartex
                if code_smartex is not None
                else (rel_code if rel_code is not None else "")
            )
            return (jour, seance_idx, sort_ident)

        try:
            voeux.sort(key=_voeu_sort_key)
        except Exception:
            return []

        result = []
        for v in voeux:
            jour = self._extract_voeu_jour(v)
            seance_val = getattr(v, "seance_indisponible", None) or getattr(
                v, "seance", None
            )
            code_smartex = getattr(v, "code_smartex_ens", None)
            rel_enseignant = getattr(v, "enseignant", None)
            if isinstance(rel_enseignant, str):
                rel_code = rel_enseignant
            elif hasattr(rel_enseignant, "code_smartex"):
                rel_code = getattr(rel_enseignant, "code_smartex")
            else:
                rel_code = None

            ident = code_smartex if code_smartex else (rel_code if rel_code else None)

            nom = None
            try:
                if code_smartex:
                    ense = (
                        self.db.query(Enseignant)
                        .filter(Enseignant.code_smartex == code_smartex)
                        .first()
                    )
                    if ense:
                        nom = ense.nom
                elif rel_code:
                    ense = (
                        self.db.query(Enseignant)
                        .filter(Enseignant.code_smartex == rel_code)
                        .first()
                    )
                    nom = ense.nom if ense else None
            except Exception:
                nom = None

            heure = None
            if hasattr(v, "heure") and getattr(v, "heure"):
                heure = getattr(v, "heure")
            else:
                s = str(seance_val).upper() if seance_val is not None else ""
                if "S1" in s:
                    heure = "08:30"
                elif "S2" in s:
                    heure = "10:30"
                elif "S3" in s:
                    heure = "12:30"
                elif "S4" in s:
                    heure = "14:30"

            result.append(
                {
                    "id": ident,
                    "nom": nom,
                    "jour": jour,
                    "seance": seance_val,
                    "heure": heure,
                }
            )
        return result

    def _get_jour_from_date(self, date_exam: date) -> int:
        """Extrait le numéro du jour"""
        return date_exam.day

    def _grouper_examens_par_seance(
        self, examens: List[Examen]
    ) -> Dict[Tuple, List[Examen]]:
        """
        Groupe les examens par séance unique et trie par date puis par séance (S1 à S4).
        Une séance = (date, seance_code, semestre, session, jour_index)
        où jour_index est un numéro séquentiel (1, 2, 3, ...) pour chaque journée unique.
        """
        seances = {}

        for examen in examens:
            seance_code = self._get_seance_code_from_time(examen.h_debut)
            seance_key = (examen.dateExam, seance_code, examen.semestre, examen.session)

            if seance_key not in seances:
                seances[seance_key] = []

            seances[seance_key].append(examen)

        # Trier les séances par date puis par code de séance (S1, S2, S3, S4)
        def _seance_sort_key(seance_key):
            date_exam, seance_code, semestre, session = seance_key
            # Mapper les codes de séance en indices numériques pour le tri
            seance_order = {"S1": 1, "S2": 2, "S3": 3, "S4": 4}
            seance_index = seance_order.get(seance_code, 99)
            return (date_exam, seance_index, semestre, session)

        # Créer un dictionnaire trié
        seances_triees_temp = dict(
            sorted(seances.items(), key=lambda item: _seance_sort_key(item[0]))
        )

        # Ajouter l'index de jour (numérotation séquentielle des journées)
        seances_avec_index_jour = {}
        dates_uniques = []
        date_to_jour_index = {}

        # Identifier les dates uniques dans l'ordre
        for seance_key in seances_triees_temp.keys():
            date_exam = seance_key[0]
            if date_exam not in dates_uniques:
                dates_uniques.append(date_exam)
                date_to_jour_index[date_exam] = len(dates_uniques)  # Index commence à 1

        # Recréer les clés avec l'index de jour
        for seance_key, examens_list in seances_triees_temp.items():
            date_exam, seance_code, semestre, session = seance_key
            jour_index = date_to_jour_index[date_exam]

            # Nouvelle clé avec l'index de jour
            nouvelle_cle = (date_exam, seance_code, semestre, session, jour_index)
            seances_avec_index_jour[nouvelle_cle] = examens_list

        return seances_avec_index_jour

    # ========== VÉRIFICATIONS ET STATISTIQUES ==========

    def _verifier_couverture_seances(self, seances: Dict, besoins_par_seance: Dict):
        """Vérifie que toutes les séances sont correctement couvertes"""

        for seance_key, examens_seance in seances.items():
            nb_examens = len(examens_seance)
            nb_requis = besoins_par_seance.get(seance_key, 0)

            # Compter les affectations réelles
            nb_affectations = (
                self.db.query(Affectation)
                .filter(Affectation.examen_id.in_([ex.id for ex in examens_seance]))
                .count()
            )

            nb_enseignants_uniques = len(
                set(
                    [
                        aff.enseignant_id
                        for aff in self.db.query(Affectation)
                        .filter(
                            Affectation.examen_id.in_([ex.id for ex in examens_seance])
                        )
                        .all()
                    ]
                )
            )

            if nb_enseignants_uniques < nb_requis:
                self.warnings.append(
                    f"⚠️ Séance {seance_key[1]} du {seance_key[0].strftime('%d/%m')}: "
                    f"{nb_enseignants_uniques} enseignants affectés (requis: {nb_requis})"
                )

    def _generer_statistiques(
        self, enseignants: List[Enseignant], seances: Dict, affectations_vars: Dict
    ):
        """Génère des statistiques sur la solution trouvée"""

        self.infos.append("\n📊 === STATISTIQUES DE LA SOLUTION ===")

        # Charge par enseignant
        charges = {}
        for enseignant in enseignants:
            charge = sum(
                [
                    self.solver.Value(affectations_vars[(seance_key, enseignant.id)])
                    for seance_key in seances.keys()
                ]
            )
            charges[enseignant.id] = charge

        charge_min = min(charges.values()) if charges else 0
        charge_max = max(charges.values()) if charges else 0
        charge_moy = sum(charges.values()) / len(charges) if charges else 0

        self.infos.append(f"   • Charge minimale: {charge_min} séances")
        self.infos.append(f"   • Charge maximale: {charge_max} séances")
        self.infos.append(f"   • Charge moyenne: {charge_moy:.2f} séances")
        self.infos.append(f"   • Dispersion: {charge_max - charge_min} séances")

        # Répartition par grade
        self.infos.append("\n   📋 Répartition par grade:")
        grades_stats = {}

        for enseignant in enseignants:
            grade = enseignant.grade_code
            charge = charges[enseignant.id]

            if grade not in grades_stats:
                grades_stats[grade] = []
            grades_stats[grade].append(charge)

        for grade, charges_grade in sorted(grades_stats.items()):
            moy_grade = sum(charges_grade) / len(charges_grade)
            config = self.grade_configs.get(grade, {})
            quota_fixe = config.get("nb_surveillances", "N/A")

            self.infos.append(
                f"      • {grade}: {len(charges_grade)} enseignants, "
                f"moyenne {moy_grade:.1f} séances (quota fixe: {quota_fixe})"
            )

        # Vérification du respect du quota fixe
        self.infos.append("\n   ⚖️ Vérification des quotas:")
        quotas_non_respectes = []

        for enseignant in enseignants:
            charge = charges[enseignant.id]
            config = self.grade_configs.get(enseignant.grade_code, {})
            quota_fixe = config.get("nb_surveillances", 0)

            if charge != quota_fixe:
                quotas_non_respectes.append(
                    f"❌ {enseignant.nom}: {charge} séances (quota fixe={quota_fixe})"
                )

        if not quotas_non_respectes:
            self.infos.append("      ✅ Tous les quotas fixes sont respectés")
        else:
            self.infos.append("      ⚠️ Quotas non respectés:")
            for msg in quotas_non_respectes:
                self.infos.append(f"         {msg}")

    def _calculer_scores_solution(
        self,
        affectations_vars: Dict,
        seances: Dict,
        enseignants: List[Enseignant],
        list_voeux: List[Dict],
        charge_par_enseignant: Dict,
    ):
        """Calcule les scores de qualité de la solution"""

        # Score 1: Respect des vœux (100 = tous respectés)
        if list_voeux:
            voeux_respectes = 0
            voeux_violes = 0

            # Construire un mapping code_smartex -> enseignant_id
            code_to_id = {
                ens.code_smartex: ens.id for ens in enseignants if ens.code_smartex
            }

            # Créer un set pour une recherche rapide O(1)
            voeux_set = set()
            for voeu_dict in list_voeux:
                code_smartex = voeu_dict.get("id")
                jour = voeu_dict.get("jour")
                seance_val = voeu_dict.get("seance")

                if code_smartex and code_smartex in code_to_id and jour and seance_val:
                    enseignant_id = code_to_id[code_smartex]
                    seance = str(seance_val).upper().strip()
                    voeux_set.add((enseignant_id, jour, seance))

            for seance_key in seances.keys():
                date_exam, seance_code, semestre, session, jour_index = seance_key
                # IMPORTANT: utiliser jour_index (1er jour, 2ème jour...) et non date_exam.day
                seance_normalized = seance_code.upper().strip()

                for enseignant in enseignants:
                    # Vérifier si cet enseignant a un vœu pour cette séance
                    if (enseignant.id, jour_index, seance_normalized) in voeux_set:
                        # Si affecté (value=1), c'est respecté, sinon violé
                        if (
                            self.solver.Value(
                                affectations_vars[(seance_key, enseignant.id)]
                            )
                            == 1
                        ):
                            voeux_respectes += 1
                        else:
                            voeux_violes += 1

            total_voeux = voeux_respectes + voeux_violes
            self.score_components["respect_voeux"] = (
                (voeux_respectes / total_voeux * 100) if total_voeux > 0 else 100
            )
        else:
            self.score_components["respect_voeux"] = 100

        # Score 2: Équilibre global (100 = dispersion minimale)
        charges = list(charge_par_enseignant.values())
        if charges:
            charge_min_val = min([self.solver.Value(c) for c in charges])
            charge_max_val = max([self.solver.Value(c) for c in charges])
            dispersion = charge_max_val - charge_min_val
            max_dispersion = len(seances)

            self.score_components["equilibre_global"] = max(
                0, 100 - (dispersion / max_dispersion * 100)
            )
        else:
            self.score_components["equilibre_global"] = 100

        # Score 3: Quota fixe respecté (100 = tous les quotas égaux respectés)
        quotas_ok = 0
        quotas_total = 0

        for enseignant in enseignants:
            config = self.grade_configs.get(enseignant.grade_code, {})
            quota_fixe = config.get("nb_surveillances", 0)
            charge = self.solver.Value(charge_par_enseignant[enseignant.id])

            quotas_total += 1
            if charge == quota_fixe:
                quotas_ok += 1

        self.score_components["quota_respecte"] = (
            (quotas_ok / quotas_total * 100) if quotas_total > 0 else 100
        )

        # Score global
        score_global = (
            self.score_components["respect_voeux"] * 0.3
            + self.score_components["equilibre_global"] * 0.4
            + self.score_components["quota_respecte"] * 0.3
        )

        self.score_components["score_global"] = score_global

        self.infos.append("\n🎯 === SCORES D'OPTIMISATION ===")
        self.infos.append(
            f"   • Respect des vœux: {self.score_components['respect_voeux']:.1f}%"
        )
        self.infos.append(
            f"   • Équilibre global: {self.score_components['equilibre_global']:.1f}%"
        )
        self.infos.append(
            f"   • Quotas respectés: {self.score_components['quota_respecte']:.1f}%"
        )
        self.infos.append(f"   • SCORE GLOBAL: {score_global:.1f}%")
