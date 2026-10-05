import React, { useState } from 'react';
import { X, CheckCircle, Laptop, ShieldCheck, Cloud, Server, Terminal, Copy, Check } from 'lucide-react';

interface WindowsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WindowsGuideModal: React.FC<WindowsGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Héberger & Tester Connect Pro hors de Google Studio</h3>
              <p className="text-xs text-slate-400">Déploiement Cloud gratuit (Render/Railway) ou exécution PC locale</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Explanation why Google Studio blocked it */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
            <p className="font-semibold text-xs mb-1">Pourquoi Google AI Studio a bloqué la page ?</p>
            <p className="text-[11px] leading-relaxed text-amber-300/90">
              Google AI Studio sécurise ses URLs de développement (<code>ais-dev-...</code>) avec une authentification Google obligatoire et des en-têtes CSP restrictifs. Si le second ordinateur n'est pas connecté à votre compte Google dans la même session, Google affiche <em>« Page not found »</em>.
            </p>
          </div>

          {/* Solution 1: GitHub vers Render (Mise a jour continue automatique) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
                <span className="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs">1</span>
                <span>Déploiement GitHub ➜ Render (Mise à jour automatique)</span>
              </div>
              <button
                onClick={() => copyToClipboard('git remote add origin https://github.com/VOTRE_USER/connect-pro.git\ngit branch -M main\ngit push -u origin main', 'git')}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
              >
                {copiedSection === 'git' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'git' ? 'Copié !' : 'Copier commandes git'}</span>
              </button>
            </div>

            <p className="text-slate-400 leading-relaxed">
              Dès que vous poussez un commit sur GitHub, Render détecte la mise à jour et relance l'application en moins d'une minute grâce au fichier <code className="text-cyan-400">render.yaml</code> :
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>1. Dépôt GitHub :</strong> Créez un dépôt sur <em>github.com/new</em> nommé <code>connect-pro</code> et poussez les fichiers (la branche <code>main</code> est déjà initialisée).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>2. Sur Render.com :</strong> Cliquez sur <em>New + &gt; Web Service</em> et connectez votre dépôt GitHub.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>3. Détection automatique :</strong> Render lit le fichier <code>render.yaml</code>, applique la commande <code>npx tsx server.ts</code> et active l'<strong>Auto-Deploy</strong>.
                </span>
              </div>
            </div>
          </div>

          {/* Solution 2: Exécuter directement sur vos 2 PC Windows (Idéal pour tester tout de suite) */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">2</span>
                <span>Option B : Lancer directement sur votre PC (Sans aucun intermédiaire)</span>
              </div>
              <button
                onClick={() => copyToClipboard('git clone <repo> && npm install && npm run dev', 'local')}
                className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
              >
                {copiedSection === 'local' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'local' ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>

            <p className="text-slate-400 leading-relaxed">
              C'est la solution la plus rapide et la plus fluide pour vos deux ordinateurs Windows :
            </p>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] text-cyan-300 space-y-2">
              <div className="text-slate-500">// Sur le PC A (Hôte) dans un terminal :</div>
              <div className="text-white">npm install</div>
              <div className="text-white">npm run dev</div>
              <div className="text-slate-500 pt-1">// Sur le PC B :</div>
              <div className="text-emerald-400">Ouvrez http://[IP_DU_PC_A]:3000 dans votre navigateur (ex : http://192.168.1.35:3000)</div>
              <div className="text-slate-400 text-[10px]">Tapez le code à 6 chiffres et contrôlez le PC A immédiatement !</div>
            </div>
          </div>

          {/* Solution 3: Cloudflare Tunnel gratuit (1 commande) */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">3</span>
                <span>Option C : Tunnel public mondial gratuit en 1 commande</span>
              </div>
              <button
                onClick={() => copyToClipboard('npx cloudflared tunnel --url http://localhost:3000', 'tunnel')}
                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
              >
                {copiedSection === 'tunnel' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'tunnel' ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>

            <p className="text-slate-400 leading-relaxed">
              Pour obtenir une URL publique HTTPS sécurisée sans ouvrir de ports sur votre box :
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-indigo-300">
              npx cloudflared tunnel --url http://localhost:3000
            </div>
            <p className="text-[11px] text-slate-500">
              Cloudflare vous génère instantanément un lien HTTPS (ex: <code>https://xyz.trycloudflare.com</code>) que vous pouvez ouvrir depuis n'importe quel ordinateur dans le monde.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition cursor-pointer"
          >
            Fermer le guide
          </button>
        </div>
      </div>
    </div>
  );
};
