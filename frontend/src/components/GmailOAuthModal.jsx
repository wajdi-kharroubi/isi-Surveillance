import { useState, useEffect } from 'react';
import { exportAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  X,
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
  Loader,
  FileText,
  Info,
  LogIn,
} from 'lucide-react';

export default function GmailOAuthModal({ isOpen, onClose }) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [tokenInfo, setTokenInfo] = useState(null);
  const [avecPiecesJointes, setAvecPiecesJointes] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResults, setSendResults] = useState(null);

  // Vérifier si on a un token sauvegardé
  useEffect(() => {
    const savedToken = localStorage.getItem('gmail_token_info');
    if (savedToken) {
      try {
        const token = JSON.parse(savedToken);
        setTokenInfo(token);
        verifyToken(token);
      } catch (e) {
        localStorage.removeItem('gmail_token_info');
      }
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      const response = await exportAPI.testerTokenGmail(token);
      if (response.data.success) {
        setIsAuthenticated(true);
        setUserEmail(response.data.user_email);
      } else {
        // Token invalide
        localStorage.removeItem('gmail_token_info');
        setTokenInfo(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Erreur vérification token:', error);
      localStorage.removeItem('gmail_token_info');
      setTokenInfo(null);
      setIsAuthenticated(false);
    }
  };

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsAuthenticating(true);
    try {
      // Obtenir l'URL d'autorisation
      const response = await exportAPI.getGmailAuthUrl();
      const authUrl = response.data.authorization_url;
      
      // Ouvrir popup Google OAuth
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        authUrl,
        'Google OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Écouter le message de callback
      const handleMessage = async (event) => {
        // Vérifier l'origine pour la sécurité
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
          const code = event.data.code;
          
          try {
            // Échanger le code contre un token
            const tokenResponse = await exportAPI.handleGmailOAuthCallback({ code });
            
            if (tokenResponse.data.success) {
              const token = tokenResponse.data.token_info;
              const email = tokenResponse.data.user_email;
              
              // Sauvegarder le token
              setTokenInfo(token);
              setUserEmail(email);
              setIsAuthenticated(true);
              localStorage.setItem('gmail_token_info', JSON.stringify(token));
              
              toast.success(`Connecté en tant que ${email}`);
              popup.close();
            }
          } catch (error) {
            console.error('Erreur échange token:', error);
            toast.error('Échec de l\'authentification Google');
          }
          
          window.removeEventListener('message', handleMessage);
          setIsAuthenticating(false);
        }
      };

      window.addEventListener('message', handleMessage);
      
      // Nettoyer si la popup est fermée sans callback
      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupClosed);
          window.removeEventListener('message', handleMessage);
          setIsAuthenticating(false);
        }
      }, 500);
      
    } catch (error) {
      console.error('Erreur OAuth:', error);
      toast.error('Erreur lors de l\'authentification Google');
      setIsAuthenticating(false);
    }
  };

  const handleSendEmails = async () => {
    if (!isAuthenticated || !tokenInfo) {
      toast.error('Veuillez d\'abord vous connecter avec Google');
      return;
    }

    setIsSending(true);
    setSendResults(null);

    try {
      const response = await exportAPI.envoyerConvocationsGmail({
        token_info: tokenInfo,
        avec_pieces_jointes: avecPiecesJointes,
      });

      setSendResults(response.data);
      
      if (response.data.success > 0) {
        toast.success(
          `${response.data.success}/${response.data.total} emails envoyés avec succès !`
        );
      }
      
      if (response.data.failed > 0) {
        toast.error(`${response.data.failed} emails n'ont pas pu être envoyés`);
      }
    } catch (error) {
      console.error('Erreur envoi emails:', error);
      toast.error(
        error.response?.data?.detail || 
        'Erreur lors de l\'envoi des emails'
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('gmail_token_info');
    setTokenInfo(null);
    setIsAuthenticated(false);
    setUserEmail('');
    setSendResults(null);
    toast.success('Déconnecté de Google');
  };

  const handleClose = () => {
    if (!isSending) {
      setSendResults(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Mail className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Envoi par Gmail</h2>
              <p className="text-purple-100 text-sm">Authentification Google OAuth2</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSending}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Authentification sécurisée Google</p>
                <p>
                  Connectez-vous avec votre compte Gmail. Les emails seront envoyés depuis votre adresse.
                  Vous pouvez choisir n'importe quel compte Gmail lors de la connexion.
                </p>
              </div>
            </div>
          </div>

          {/* État d'authentification */}
          {!isAuthenticated ? (
            <div className="text-center space-y-4">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-red-500 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                <Mail className="w-12 h-12 text-white" />
              </div>
              <p className="text-gray-600">
                Connectez-vous avec votre compte Google pour commencer
              </p>
              <button
                onClick={handleGoogleLogin}
                disabled={isAuthenticating}
                className="mx-auto flex items-center gap-3 bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAuthenticating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Authentification en cours...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Se connecter avec Google
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              {/* Utilisateur connecté */}
              <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-900">Connecté</p>
                      <p className="text-sm text-green-700">{userEmail}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={isSending}
                    className="text-sm text-green-700 hover:text-green-900 underline disabled:opacity-50"
                  >
                    Déconnexion
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="pieces-jointes-oauth"
                  checked={avecPiecesJointes}
                  onChange={(e) => setAvecPiecesJointes(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  disabled={isSending}
                />
                <label htmlFor="pieces-jointes-oauth" className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <FileText className="w-4 h-4" />
                  Joindre les convocations en pièces jointes (format PDF)
                </label>
              </div>

              {/* Bouton d'envoi */}
              <button
                onClick={handleSendEmails}
                disabled={isSending}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 px-6 rounded-lg font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Envoyer les convocations
                  </>
                )}
              </button>

              {/* Résultats */}
              {sendResults && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg text-gray-800">Résultats de l'envoi</h3>
                  
                  {/* Statistiques */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">{sendResults.total}</div>
                      <div className="text-xs text-blue-700">Total</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">{sendResults.success}</div>
                      <div className="text-xs text-green-700">Réussis</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-red-600">{sendResults.failed}</div>
                      <div className="text-xs text-red-700">Échecs</div>
                    </div>
                  </div>

                  {/* Détails */}
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {sendResults.details?.map((detail, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 p-3 rounded-lg border ${
                          detail.success
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        {detail.success ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${
                            detail.success ? 'text-green-900' : 'text-red-900'
                          }`}>
                            {detail.enseignant}
                          </p>
                          {detail.email && (
                            <p className="text-xs text-gray-600">{detail.email}</p>
                          )}
                          {detail.error && (
                            <p className="text-xs text-red-600">{detail.error}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isSending}
            className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
