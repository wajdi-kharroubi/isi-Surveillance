import { useState } from 'react';
import { exportAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  X,
  Mail,
  Lock,
  Send,
  CheckCircle,
  AlertCircle,
  Loader,
  FileText,
  Info,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function EmailConvocationsModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avecPiecesJointes, setAvecPiecesJointes] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [sendResults, setSendResults] = useState(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!email || !password) {
      toast.error('Veuillez renseigner l\'email et le mot de passe');
      return;
    }

    setIsTestingConnection(true);
    try {
      const response = await exportAPI.testerConnexionEmail({ email, password });
      if (response.data.success) {
        toast.success('Connexion Gmail réussie !');
        setConnectionTested(true);
      }
    } catch (error) {
      console.error('Erreur test connexion:', error);
      toast.error(
        error.response?.data?.detail || 
        'Échec de la connexion Gmail. Vérifiez vos identifiants.'
      );
      setConnectionTested(false);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSendEmails = async () => {
    if (!connectionTested) {
      toast.error('Veuillez d\'abord tester la connexion Gmail');
      return;
    }

    setIsSending(true);
    setSendResults(null);

    try {
      const response = await exportAPI.envoyerConvocationsEmail({
        email,
        password,
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

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setConnectionTested(false);
    setSendResults(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Envoi des Convocations</h2>
              <p className="text-blue-100 text-sm">Par email via Gmail</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Important : Mot de passe d'application Gmail</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Allez sur <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="underline">https://myaccount.google.com/security</a></li>
                <li>Activez la validation en deux étapes</li>
                <li>Générez un "mot de passe d'application"</li>
                <li>Utilisez ce mot de passe (pas votre mot de passe habituel)</li>
              </ol>
            </div>
          </div>

          {/* Email Credentials Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Adresse Email Gmail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setConnectionTested(false);
                }}
                placeholder="votre.email@gmail.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSending}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Mot de passe d'application
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setConnectionTested(false);
                  }}
                  placeholder="Mot de passe d'application"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isSending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="pieces-jointes"
                checked={avecPiecesJointes}
                onChange={(e) => setAvecPiecesJointes(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                disabled={isSending}
              />
              <label htmlFor="pieces-jointes" className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                <FileText className="w-4 h-4" />
                Joindre les convocations en pièces jointes (format PDF)
              </label>
            </div>

            {/* Test Connection Button */}
            <button
              onClick={handleTestConnection}
              disabled={isTestingConnection || isSending || !email || !password}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                connectionTested
                  ? 'bg-green-100 text-green-700 border-2 border-green-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isTestingConnection ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Test de connexion...</span>
                </>
              ) : connectionTested ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Connexion réussie ✓</span>
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  <span>Tester la connexion Gmail</span>
                </>
              )}
            </button>
          </div>

          {/* Send Results */}
          {sendResults && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Résultats de l'envoi</h3>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-blue-600">{sendResults.total}</div>
                  <div className="text-sm text-blue-700">Total</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-600">{sendResults.success}</div>
                  <div className="text-sm text-green-700">Réussis</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold text-red-600">{sendResults.failed}</div>
                  <div className="text-sm text-red-700">Échecs</div>
                </div>
              </div>

              {/* Details */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {sendResults.details.map((detail, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      detail.success
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    {detail.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {detail.enseignant || `Enseignant #${detail.enseignant_id}`}
                      </div>
                      {detail.email && (
                        <div className="text-sm text-gray-600 truncate">{detail.email}</div>
                      )}
                      {detail.error && (
                        <div className="text-sm text-red-600">{detail.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 border-t pt-6">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSending}
            >
              Fermer
            </button>
            <button
              onClick={handleSendEmails}
              disabled={!connectionTested || isSending}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            >
              {isSending ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Envoyer les Convocations</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
