/** Legal and privacy copy shared across the app (Italy / GDPR / Codice privacy). */

export const APP_NAME = "Italiarena";
export const APP_LEGAL_NAME = APP_NAME;
export const APP_WEBSITE = "https://italiarena.com";

export const SUPPORT_EMAIL = "support@italiarena.com";

/** Privacy and data-protection requests (same inbox as general support). */
export const PRIVACY_CONTACT_EMAIL = SUPPORT_EMAIL;

export const PRIVACY_POLICY_LAST_UPDATED_ISO = "2026-09-11";
export const PRIVACY_POLICY_LAST_UPDATED_IT = "11 settembre 2026";
export const PRIVACY_POLICY_LAST_UPDATED_EN = "11 September 2026";

export const PRIVACY_HREF_IT = "/privacy";
export const PRIVACY_HREF_EN = "/privacy?lang=en";

export function privacyHref(locale: PrivacyLocale) {
  return locale === "en" ? PRIVACY_HREF_EN : PRIVACY_HREF_IT;
}

/** Minimum age to use the service in Italy (art. 2-quinquies Codice privacy). */
export const MINIMUM_AGE_ITALY = 14;

export const ITALIAN_DPA_NAME =
  "Garante per la protezione dei dati personali";

export const ITALIAN_DPA_URL = "https://www.garanteprivacy.it";

export const ITALIAN_DPA_ADDRESS = "Piazza Venezia 11, 00187 Roma";

export const ITALIAN_DPA_PHONE = "+39 06 696771";

export const ITALIAN_DPA_PEC = "protocollo@pec.gpdp.it";

export const ITALIAN_DPA_COMPLAINT_URL =
  "https://www.garanteprivacy.it/home/diritti/come-agire-per-tutelare-i-tuoi-dati-personali";

export const GOOGLE_PRIVACY_URL = "https://policies.google.com/privacy";
export const SUPABASE_PRIVACY_URL = "https://supabase.com/privacy";
export const VERCEL_PRIVACY_URL = "https://vercel.com/legal/privacy-policy";
export const GROQ_PRIVACY_URL = "https://groq.com/privacy-policy";

export type PrivacyLocale = "it" | "en";

export function resolvePrivacyLocale(value: string | undefined): PrivacyLocale {
  return value === "en" ? "en" : "it";
}

export type PrivacyPolicyTable = {
  headers: readonly string[];
  rows: readonly (readonly string[])[];
};

export type PrivacyPolicySection = {
  title: string;
  body: string;
  items?: readonly string[];
  table?: PrivacyPolicyTable;
};

export type PrivacyCopy = {
  title: string;
  metaDescription: string;
  lastUpdated: string;
  jurisdictionLabel: string;
  intro: string;
  officialLanguageNote: string;
  languageSwitchLabel: string;
  languageSwitchIt: string;
  languageSwitchEn: string;
  contactHeading: string;
  contactBefore: string;
  contactBetween: string;
  contactAfter: string;
  footerLinkLabel: string;
  footerNotice: string;
  sections: readonly PrivacyPolicySection[];
};

function buildItalianCopy(): PrivacyCopy {
  return {
    title: "Informativa sul trattamento dei dati personali",
    metaDescription:
      "Informativa privacy di Italiarena ai sensi degli artt. 13 e 14 del GDPR, del Codice privacy italiano (D.Lgs. 196/2003) e della normativa italiana su cookie, comunicazioni elettroniche e intelligenza artificiale.",
    lastUpdated: `Aggiornata l’${PRIVACY_POLICY_LAST_UPDATED_IT}`,
    jurisdictionLabel: "Italia",
    intro:
      "La presente informativa è resa ai sensi degli articoli 12, 13 e 14 del Regolamento (UE) 2016/679 («GDPR») e del Codice in materia di protezione dei dati personali (D.Lgs. 30 giugno 2003, n. 196, come modificato dal D.Lgs. 10 agosto 2018, n. 101 e successive modificazioni, «Codice privacy») a chi usa Italiarena in Italia o dal territorio italiano. Il testo è redatto in linguaggio chiaro e semplice, come richiesto dagli artt. 12–14 GDPR, dalle Linee guida WP29 sulla trasparenza (WP260 rev. 01, 11 aprile 2018) e dalle indicazioni del Garante. In caso di contrasto tra versioni linguistiche, prevale il testo italiano.",
    officialLanguageNote:
      "Versione ufficiale in italiano. È disponibile una traduzione in inglese.",
    languageSwitchLabel: "Lingua dell’informativa",
    languageSwitchIt: "Italiano",
    languageSwitchEn: "English",
    contactHeading: "Contatti",
    contactBefore: "Per richieste in materia di privacy scrivere a ",
    contactBetween:
      ". Per presentare un reclamo all’autorità di controllo italiana, rivolgersi al ",
    contactAfter: ".",
    footerLinkLabel: "Informativa privacy",
    footerNotice:
      "Trattamento dei dati conforme al GDPR e al Codice privacy italiano (D.Lgs. 196/2003).",
    sections: [
      {
        title: "1. Quadro normativo applicabile",
        body:
          "Il trattamento è regolato dalle norme di seguito indicate, nei limiti in cui si applicano ai dati effettivamente trattati da Italiarena (account, partite, preferenze, eventuali accessi con Google, notifiche push facoltative, spiegazioni IA facoltative, segnalazioni e contributi alla community):",
        items: [
          "Regolamento (UE) 2016/679 (GDPR), in particolare artt. 5–7, 12–22, 24–25, 28, 32, 37, 44–49, 77–79.",
          "D.Lgs. 30 giugno 2003, n. 196 (Codice privacy), come adeguato al GDPR dal D.Lgs. 10 agosto 2018, n. 101, in particolare artt. 2-quinquies (età del consenso digitale), 2-terdecies (persone decedute), 122 (archiviazione di informazioni nell’apparecchio terminale), 130 (comunicazioni elettroniche), 141 (reclamo al Garante) e 152 (tutela giurisdizionale).",
          "Direttiva 2002/58/CE (ePrivacy), recepita in Italia dagli artt. 122 e 130 del Codice privacy.",
          "Linee guida cookie e altri strumenti di tracciamento del Garante, provvedimento n. 231 del 10 giugno 2021.",
          "Regolamento (UE) 2024/1689 (AI Act), per gli aspetti di trasparenza collegati alle funzioni di intelligenza artificiale del servizio.",
          "Legge 23 settembre 2025, n. 132 (disposizioni in materia di intelligenza artificiale), in particolare artt. 3 e 4 su trasparenza, riservatezza e accesso dei minori alle tecnologie di IA.",
        ],
      },
      {
        title: "2. Titolare del trattamento",
        body:
          `Il titolare del trattamento è il gestore del servizio ${APP_LEGAL_NAME} ` +
          `(sito: ${APP_WEBSITE}), stabilito in Italia. Per ogni questione relativa ai dati personali, ` +
          `compreso l’esercizio dei diritti di cui agli artt. 15–22 GDPR, è possibile scrivere a ` +
          `${PRIVACY_CONTACT_EMAIL}. Non è nominato un rappresentante nell’Unione ai sensi dell’art. 27 GDPR, ` +
          `perché il titolare è stabilito nell’Unione europea.`,
      },
      {
        title: "3. Responsabile della protezione dei dati (RPD/DPO)",
        body:
          "Non è stato designato un Responsabile della protezione dei dati, perché il trattamento non rientra nei casi di nomina obbligatoria di cui all’art. 37 GDPR (non si tratta di pubblica amministrazione, né di monitoraggio regolare e sistematico su larga scala, né di trattamento su larga scala di categorie particolari di dati o di dati giudiziari).",
      },
      {
        title: "4. Categorie di dati personali trattati",
        body:
          "Trattiamo solo i dati necessari al servizio, in linea con i principi di minimizzazione e limitazione delle finalità (art. 5 GDPR). Le categorie corrispondono ai dati che l’app raccoglie realmente:",
        items: [
          "Dati di identificazione e contatto: indirizzo e-mail, password in forma non in chiaro (gestita dal fornitore di autenticazione), nome visualizzato (username), ruolo interno (utente o amministratore), stato di verifica dell’e-mail.",
          "Accesso con Google (solo se scelto dall’utente): identificativo dell’account Google, nome e indirizzo e-mail comunicati da Google al momento dell’autenticazione.",
          "Modalità ospite: nome generato automaticamente e, se usata l’autenticazione ospite, un indirizzo e-mail tecnico non reale (formato guest-…@guest.local). Gli ospiti non compaiono in classifica e non possono inviare domande alla community.",
          "Profilo di apprendimento: livello di italiano (QECR), lingua oggetto di studio (italiano), preferenze di suono e feedback aptico.",
          "Dati di gioco: statistiche, domande già viste, storico partite, punteggi, esito (vittoria/sconfitta/pareggio), tipo di avversario, errori e progresso della pratica sugli errori, risposte e punteggi della sessione di gioco in corso.",
          "Partite «ghost»: le risposte di una partita già giocata possono essere riutilizzate per un avversario automatico. L’interfaccia mostra un nome generico («Ghost Opponent»), non il username dell’utente originario.",
          "Classifica: per gli account registrati, nome visualizzato e risultati PvP (partite, vittorie, percentuale, punti) visibili agli altri utenti autenticati.",
          "Segnalazioni e contributi: tipo di problema segnalato su una domanda; testo delle domande proposte alla community, opzioni, risposta corretta, eventuale motivazione e, per i revisori, note di revisione.",
          "Intelligenza artificiale (solo su richiesta): testo della domanda, testo della risposta corretta, testo della risposta selezionata e spiegazione generata per «Ask AI»; registro del numero di richieste per partita; per i contributi alla community, un pre-controllo automatico della domanda (parere non vincolante per un revisore umano).",
          "Notifiche push (solo se attivate): endpoint di sottoscrizione, chiavi tecniche (p256dh e auth), user-agent del browser, fuso orario IANA, ora preferita del promemoria giornaliero e data dell’ultimo invio.",
          "Dati tecnici di autenticazione e sicurezza: cookie e token di sessione, indirizzo IP e user-agent eventualmente presenti nei log tecnici dell’hosting, data e ora degli accessi.",
          "Dati memorizzati sul dispositivo: preferenze di suono/volume/aptica, tema grafico, stato locale della partita e dati temporanei di navigazione (si veda la sezione cookie).",
        ],
      },
      {
        title: "5. Fonte dei dati (artt. 13 e 14 GDPR)",
        body: "I dati provengono da queste fonti:",
        items: [
          "Dati forniti dall’interessato: registrazione, onboarding, impostazioni, partite, segnalazioni, contributi, richiesta «Ask AI», attivazione delle notifiche.",
          "Dati generati dal servizio: punteggi, statistiche, classifica, sessioni di gioco, pre-controllo IA dei contributi, log di sicurezza.",
          "Dati provenienti da terzi: se si usa «Accedi con Google», Google LLC comunica i dati di account necessari all’autenticazione. Google tratta i dati del proprio account come titolare autonomo, secondo la propria informativa.",
          "Non acquistiamo elenchi di contatti e non raccogliamo dati da fonti pubbliche per profilare gli utenti.",
        ],
      },
      {
        title: "6. Categorie particolari e dati giudiziari",
        body:
          "Non chiediamo né trattiamo intenzionalmente categorie particolari di dati ex art. 9 GDPR (origine razziale o etnica, opinioni politiche, convinzioni religiose o filosofiche, appartenenza sindacale, dati genetici, biometrici, sulla salute o sulla vita/orientamento sessuale) né dati giudiziari ex art. 10 GDPR e art. 2-octies del Codice privacy. Si prega di non inserire tali dati nei testi delle domande o delle segnalazioni.",
      },
      {
        title: "7. Finalità, basi giuridiche e tempi di conservazione",
        body:
          "Per ciascuna finalità indichiamo la base giuridica (art. 6 GDPR) e il periodo di conservazione (art. 13, par. 2, lett. a, GDPR):",
        items: [
          "Creazione e gestione dell’account (e-mail, credenziali, username, profilo): esecuzione del contratto o misure precontrattuali, art. 6, par. 1, lett. b, GDPR; conservazione per tutta la durata dell’account.",
          "Verifica dell’e-mail e reimpostazione della password: esecuzione del contratto, art. 6, par. 1, lett. b; i link hanno scadenza tecnica breve.",
          "Accesso con Google: esecuzione del contratto, art. 6, par. 1, lett. b, e, per i cookie/script di Google necessari a quell’accesso, art. 122, comma 1, secondo periodo, Codice privacy (misura strettamente necessaria al servizio richiesto).",
          "Modalità ospite: esecuzione del contratto, art. 6, par. 1, lett. b; conservazione per la sessione ospite o fino alla conversione in account registrato.",
          "Partite, classifica, statistiche, pratica degli errori, partite ghost e stato della sessione: esecuzione del contratto, art. 6, par. 1, lett. b; conservazione per tutta la durata dell’account. I dati ghost restano utilizzabili per il matchmaking finché l’account è attivo.",
          "Preferenze di suono, vibrazione e tema: esecuzione del contratto, art. 6, par. 1, lett. b; sul dispositivo restano finché l’utente non le cancella.",
          "Segnalazione di domande errate o ambigue: legittimo interesse a mantenere contenuti didattici corretti (art. 6, par. 1, lett. f); l’interesse è la qualità del gioco per tutti gli utenti, con impatto minimo sull’interessato (si conserva il tipo di problema e l’identificativo di chi segnala); conservazione fino alla risoluzione e comunque non oltre 24 mesi.",
          "Invio di domande alla community: esecuzione del contratto, art. 6, par. 1, lett. b; conservazione fino alla revisione; se approvata, la domanda resta nel database di gioco (senza esporre l’e-mail del contributore agli altri giocatori).",
          "Spiegazioni «Ask AI»: consenso, art. 6, par. 1, lett. a, espresso con la richiesta puntuale; le spiegazioni possono restare in una cache condivisa per coppia domanda/risposta, in forma non nominativa; il conteggio delle richieste per partita resta per la durata dell’account. Il consenso è revocabile non usando più la funzione.",
          "Pre-controllo automatico dei contributi: esecuzione del contratto, art. 6, par. 1, lett. b, e, in quanto uso di un sistema di IA, nel rispetto dell’art. 4 della L. 132/2025 (informazione chiara e possibilità di non usare la funzione di invio). La decisione finale è sempre umana; non è una decisione automatizzata ex art. 22 GDPR.",
          "Promemoria giornaliero via push: consenso, art. 6, par. 1, lett. a, GDPR, prestato attivando la funzione nelle Impostazioni e accettando il permesso del browser. Si applica anche l’art. 122 Codice privacy (memorizzazione dell’abbonamento push sul dispositivo) e, per il carattere di sollecito a tornare nell’app, l’art. 130 Codice privacy (comunicazioni elettroniche: consenso preventivo, libero, specifico e documentato). Conservazione fino alla disattivazione o alla cancellazione dell’account.",
          "Sicurezza, prevenzione abusi e funzionamento tecnico: legittimo interesse, art. 6, par. 1, lett. f; log tecnici di regola fino a 90 giorni, salvo obbligo di legge di conservazione più lunga.",
          "Adempimento di obblighi di legge (es. risposta a richieste dell’autorità): art. 6, par. 1, lett. c, GDPR.",
        ],
      },
      {
        title: "8. Natura del conferimento e conseguenze del rifiuto",
        body:
          "Il conferimento di e-mail e password (o dell’account Google) e, per la modalità ospite, del livello di italiano è necessario per concludere il contratto e usare il servizio (art. 13, par. 2, lett. e, GDPR). Il rifiuto impedisce la creazione dell’account o l’accesso alle partite. Username personalizzato, segnalazioni, contributi, «Ask AI» e notifiche push sono facoltativi: non usarli non blocca le funzioni essenziali, ma limita le funzioni collegate. Le comunicazioni di servizio (verifica e-mail, reimpostazione password) sono necessarie all’account e non sono messaggi promozionali.",
      },
      {
        title: "9. Destinatari e responsabili del trattamento",
        body:
          "I dati possono essere comunicati, nei limiti delle finalità indicate, a soggetti che li trattano per nostro conto come responsabili ex art. 28 GDPR, vincolati da accordo di nomina, oppure, in casi specifici, a titolari autonomi:",
        items: [
          `Supabase Inc. — database, autenticazione e hosting dei dati applicativi (${SUPABASE_PRIVACY_URL}).`,
          `Vercel Inc. — hosting dell’applicazione web (${VERCEL_PRIVACY_URL}).`,
          `Groq Inc. — generazione delle spiegazioni «Ask AI» e pre-controllo dei contributi, solo se si usano quelle funzioni (${GROQ_PRIVACY_URL}).`,
          `Google LLC — autenticazione «Accedi con Google», solo se scelta dall’utente. Google è titolare autonomo per i trattamenti del proprio account (${GOOGLE_PRIVACY_URL}).`,
          "Servizi di push del browser/sistema operativo (ad esempio Apple, Google FCM o Mozilla, a seconda del dispositivo) — recapito delle notifiche, solo se attivate.",
          "Autorità pubbliche, se ciò è imposto dalla legge.",
        ],
      },
      {
        title: "10. Trasferimenti verso Paesi terzi",
        body:
          "Alcuni fornitori possono trattare dati fuori dallo Spazio economico europeo, in particolare negli Stati Uniti. I trasferimenti avvengono nel rispetto degli artt. 44–49 GDPR, sulla base di una decisione di adeguatezza della Commissione europea (incluso, ove l’importatore sia certificato, il Data Privacy Framework UE–USA) e/o delle Clausole contrattuali tipo (SCC) approvate dalla Commissione, con le misure supplementari adottate dai fornitori. Copia delle garanzie applicabili può essere chiesta a " +
          PRIVACY_CONTACT_EMAIL +
          ".",
      },
      {
        title: "11. Cookie e altri strumenti di memorizzazione sul dispositivo (art. 122 Codice privacy)",
        body:
          "Ai sensi dell’art. 122 del Codice privacy e delle Linee guida del Garante del 10 giugno 2021, l’archiviazione di informazioni sull’apparecchio o l’accesso a informazioni già archiviate è consentita senza consenso solo se è tecnica, cioè strettamente necessaria a trasmettere una comunicazione o a erogare il servizio richiesto. Italiarena non usa cookie di profilazione, pubblicitari o di misurazione dell’audience. Non è quindi richiesto un banner di consenso ai cookie. Gli strumenti usati sono i seguenti:",
        table: {
          headers: [
            "Strumento",
            "Tipologia",
            "Finalità",
            "Durata",
            "Parte",
          ],
          rows: [
            [
              "Cookie di sessione Supabase (prefisso sb-, token di autenticazione)",
              "Tecnico",
              "Mantenere l’accesso sicuro all’account",
              "Fino alla scadenza o al rinnovo del token di sessione",
              "Prima parte, tramite fornitore di autenticazione",
            ],
            [
              "Cookie / storage PKCE (code-verifier) per l’accesso",
              "Tecnico",
              "Completare il flusso di login o OAuth in modo sicuro",
              "Sessione o breve durata tecnica",
              "Prima parte",
            ],
            [
              "localStorage language-quiz-game",
              "Tecnico (memorizzazione locale)",
              "Stato locale della partita sul dispositivo",
              "Fino alla cancellazione da parte dell’utente",
              "Prima parte",
            ],
            [
              "localStorage lq-gameplay-preferences",
              "Tecnico",
              "Volume, suoni e feedback aptico",
              "Fino alla cancellazione da parte dell’utente",
              "Prima parte",
            ],
            [
              "localStorage del tema grafico",
              "Tecnico",
              "Ricordare il tema chiaro o scuro",
              "Fino alla cancellazione da parte dell’utente",
              "Prima parte",
            ],
            [
              "sessionStorage (intento di matchmaking, recupero errori di caricamento)",
              "Tecnico",
              "Navigazione e stabilità dell’app",
              "Fine sessione del browser",
              "Prima parte",
            ],
            [
              "Service worker e sottoscrizione Web Push",
              "Tecnico, attivato solo con consenso alle notifiche",
              "Recapitare i promemoria scelti dall’utente",
              "Fino alla disiscrizione o alla cancellazione dell’account",
              "Prima parte e servizio push del browser",
            ],
            [
              "Google Identity Services (script sulla pagina di accesso)",
              "Tecnico di autenticazione di terza parte",
              "Autenticazione Google. Lo script si carica all’apertura della pagina di accesso, se la funzione è attiva, non solo dopo il clic sul pulsante.",
              "Secondo le impostazioni e l’informativa di Google",
              "Google LLC",
            ],
          ],
        },
        items: [
          "Se l’accesso con Google è configurato, la pagina di accesso carica lo script Google Identity Services già all’apertura. Google può memorizzare cookie sul proprio dominio in quel momento, non solo dopo il clic su «Accedi con Google».",
          "L’utente può cancellare cookie e dati locali dalle impostazioni del browser; in tal caso potrebbe essere necessario ripetere l’accesso.",
          "Non usiamo Google Analytics, pixel pubblicitari, social plugin di tracciamento né strumenti analoghi.",
        ],
      },
      {
        title: "12. Comunicazioni elettroniche e notifiche push (art. 130 Codice privacy)",
        body:
          "Ai sensi dell’art. 130 del Codice privacy non inviamo comunicazioni promozionali, newsletter o messaggi pubblicitari via e-mail, telefono o sistemi automatizzati senza un consenso preventivo, libero, specifico, informato e documentato. Non ci avvaliamo dell’eccezione di «soft spam» di cui all’art. 130, comma 4. Il servizio invia soltanto: (i) messaggi strettamente necessari all’account (verifica e-mail, reimpostazione password); (ii) promemoria push giornalieri, solo se l’utente li attiva nelle Impostazioni, concede il permesso del browser e può disattivarli in qualsiasi momento. I promemoria non sono usati per profilazione commerciale.",
      },
      {
        title: "13. Sistemi di intelligenza artificiale",
        body:
          "Italiarena usa sistemi di IA di terzi (modelli ospitati da Groq) in due casi, entrambi facoltativi e con sorveglianza umana, in linea con gli artt. 3 e 4 della L. 23 settembre 2025, n. 132 e con i principi di trasparenza del Regolamento (UE) 2024/1689:",
        items: [
          "«Ask AI»: su richiesta esplicita, il testo della domanda, il testo della risposta corretta e quello della risposta selezionata sono inviati al fornitore per generare una spiegazione didattica in inglese. Non inviamo il nome, l’e-mail, l’elenco completo delle opzioni o altri dati di contatto nel prompt. L’utente può astenersi dal chiedere spiegazioni in qualsiasi momento.",
          "Pre-controllo dei contributi: se si invia una domanda alla community, un modello di IA formula un parere non vincolante (ad esempio su lingua, livello QECR e categoria). Un amministratore umano decide se approvare o respingere. Non è una decisione basata unicamente su un trattamento automatizzato con effetti giuridici o analogamente significativi (art. 22 GDPR).",
          "I dati inviati all’IA non sono usati da Italiarena per addestrare modelli propri. Il fornitore li tratta secondo il proprio contratto e la propria informativa.",
          "L’accesso alle funzioni di IA è riservato a chi ha almeno 14 anni, come il resto del servizio. Per i minori di 14 anni occorrerebbe il consenso di chi esercita la responsabilità genitoriale (art. 2-quinquies Codice privacy e art. 4, comma 4, L. 132/2025); il servizio non è destinato a quella fascia di età.",
        ],
      },
      {
        title: "14. Processi decisionali automatizzati e profilazione",
        body:
          "Non compiamo decisioni automatizzate che producano effetti giuridici o incidano in modo analogamente significativo sull’interessato ai sensi dell’art. 22 GDPR. L’abbinamento degli avversari si basa sul livello di italiano dichiarato, al solo fine di organizzare partite equilibrate, senza profilazione commerciale e senza vendita di dati a terzi per marketing.",
      },
      {
        title: "15. Misure di sicurezza",
        body:
          "Adottiamo misure tecniche e organizzative adeguate ai sensi dell’art. 32 GDPR e dei principi di privacy by design e by default (art. 25 GDPR), tra cui: cifratura in transito (HTTPS/TLS), gestione delle credenziali tramite il fornitore di autenticazione (password non memorizzate in chiaro), accesso ristretto ai dati di produzione, accordi con i responsabili e cancellazione dell’account su richiesta.",
      },
      {
        title: "16. Diritti dell’interessato",
        body:
          `Ai sensi degli artt. 15–22 GDPR e del Codice privacy, l’interessato ha diritto di: accesso; rettifica; cancellazione; limitazione; opposizione (ove applicabile, in particolare per i trattamenti basati sul legittimo interesse); portabilità; revoca del consenso per «Ask AI» e per le notifiche push, senza pregiudizio della liceità del trattamento precedente. Può aggiornare il profilo nelle Impostazioni, cancellare l’account in qualsiasi momento o scrivere a ${PRIVACY_CONTACT_EMAIL}. Rispondiamo entro un mese dalla richiesta, prorogabile di due mesi nei casi complessi, come previsto dall’art. 12, par. 3, GDPR. L’esercizio dei diritti è in linea di principio gratuito (art. 12, par. 5).`,
      },
      {
        title: "17. Diritti relativi alle persone decedute (art. 2-terdecies Codice privacy)",
        body:
          "I diritti di cui agli artt. 15–22 GDPR relativi a dati di persone decedute possono essere esercitati da chi ha un interesse proprio, agisce a tutela dell’interessato come mandatario, o per ragioni familiari meritevoli di protezione, salvi i limiti di legge e l’eventuale divieto espresso, specifico e informato dell’interessato, nei termini dell’art. 2-terdecies. Per tali richieste scrivere a " +
          PRIVACY_CONTACT_EMAIL +
          ".",
      },
      {
        title: "18. Reclamo al Garante e tutela giurisdizionale",
        body:
          `L’interessato può proporre reclamo al ${ITALIAN_DPA_NAME} ai sensi dell’art. 77 GDPR e dell’art. 141 del Codice privacy, oppure agire dinanzi all’autorità giudiziaria ordinaria ai sensi degli artt. 78 e 79 GDPR e dell’art. 152 del Codice privacy. Il reclamo non pregiudica ogni altra azione amministrativa o giurisdizionale.`,
        items: [
          `Sito: ${ITALIAN_DPA_URL}`,
          `Come presentare un reclamo: ${ITALIAN_DPA_COMPLAINT_URL}`,
          `Indirizzo: ${ITALIAN_DPA_ADDRESS}`,
          `Telefono: ${ITALIAN_DPA_PHONE}`,
          `PEC: ${ITALIAN_DPA_PEC}`,
        ],
      },
      {
        title: "19. Minori",
        body:
          `Il servizio è destinato a chi ha compiuto ${MINIMUM_AGE_ITALY} anni, in conformità all’art. 8 GDPR e all’art. 2-quinquies del Codice privacy (età del consenso per i servizi della società dell’informazione in Italia) e, per le funzioni di IA, all’art. 4, comma 4, della L. 132/2025. Non raccogliamo consapevolmente dati di minori di ${MINIMUM_AGE_ITALY} anni. Se si ritiene che un minore abbia conferito dati senza valido consenso di chi esercita la responsabilità genitoriale, occorre scriverci a ${PRIVACY_CONTACT_EMAIL}: cancelleremo i dati senza ingiustificato ritardo.`,
      },
      {
        title: "20. Cancellazione dell’account e conservazione residua",
        body:
          "Con la cancellazione dell’account dalle Impostazioni eliminiamo, senza ingiustificato ritardo, profilo, statistiche, storico partite, errori, sottoscrizioni push, registri «Ask AI» collegati all’utente e gli altri dati personali collegati. Copie residue possono restare nei backup cifrati per un periodo tecnico limitato (fino a 30 giorni) prima della cancellazione automatica. Le spiegazioni IA in cache per domanda/risposta e le domande della community già approvate possono restare in forma anonima o non identificabile. I dati strettamente necessari a tutelare i diritti in giudizio o ad adempiere obblighi di legge possono essere conservati per il tempo richiesto dalla normativa italiana.",
      },
      {
        title: "21. Modifiche alla presente informativa",
        body:
          "Possiamo aggiornare questa informativa per riflettere modifiche al servizio o alla normativa. La data di aggiornamento è indicata in testa alla pagina. Per modifiche sostanziali forniamo un avviso chiaro nell’app, ove opportuno.",
      },
    ],
  };
}

function buildEnglishCopy(): PrivacyCopy {
  return {
    title: "Personal-data information notice",
    metaDescription:
      "Italiarena privacy notice under Articles 13 and 14 GDPR, the Italian Privacy Code (Legislative Decree 196/2003), and Italian rules on cookies, electronic communications, and artificial intelligence.",
    lastUpdated: `Last updated: ${PRIVACY_POLICY_LAST_UPDATED_EN}`,
    jurisdictionLabel: "Italy",
    intro:
      "This notice is provided under Articles 12, 13 and 14 of Regulation (EU) 2016/679 (the «GDPR») and the Italian Personal Data Protection Code (Legislative Decree no. 196 of 30 June 2003, as amended by Legislative Decree no. 101 of 10 August 2018, the «Codice privacy») to users of Italiarena in Italy or using the service from Italy. It is written in clear language as required by Articles 12–14 GDPR, the Article 29 Working Party transparency guidelines (WP260 rev. 01, 11 April 2018), and Garante guidance. If versions conflict, the Italian text prevails.",
    officialLanguageNote:
      "Official version: Italian. This English text is a translation.",
    languageSwitchLabel: "Notice language",
    languageSwitchIt: "Italiano",
    languageSwitchEn: "English",
    contactHeading: "Contact",
    contactBefore: "For privacy requests, email ",
    contactBetween:
      ". To lodge a complaint with the Italian supervisory authority, contact the ",
    contactAfter: ".",
    footerLinkLabel: "Privacy policy",
    footerNotice:
      "Data processing in compliance with the GDPR and the Italian Privacy Code (Legislative Decree 196/2003).",
    sections: [
      {
        title: "1. Applicable legal framework",
        body:
          "Processing is governed by the following rules, to the extent they apply to the data Italiarena actually processes (accounts, matches, preferences, optional Google sign-in, optional push reminders, optional AI explanations, reports, and community submissions):",
        items: [
          "Regulation (EU) 2016/679 (GDPR), in particular Articles 5–7, 12–22, 24–25, 28, 32, 37, 44–49, and 77–79.",
          "Legislative Decree no. 196 of 30 June 2003 (Codice privacy), as aligned with the GDPR by Legislative Decree no. 101 of 10 August 2018, in particular Articles 2-quinquies (digital consent age), 2-terdecies (deceased persons), 122 (storage of information on a user’s device), 130 (electronic communications), 141 (complaint to the Garante), and 152 (judicial protection).",
          "Directive 2002/58/EC (ePrivacy), implemented in Italy by Articles 122 and 130 of the Codice privacy.",
          "Garante guidelines on cookies and other tracking tools, measure no. 231 of 10 June 2021.",
          "Regulation (EU) 2024/1689 (AI Act), for transparency aspects of the service’s AI features.",
          "Italian Law no. 132 of 23 September 2025 (artificial intelligence), in particular Articles 3 and 4 on transparency, confidentiality, and minors’ access to AI.",
        ],
      },
      {
        title: "2. Data controller",
        body:
          `The data controller is the operator of ${APP_LEGAL_NAME} ` +
          `(website: ${APP_WEBSITE}), established in Italy. For any request relating to your personal data, ` +
          `including rights under Articles 15–22 GDPR, contact ${PRIVACY_CONTACT_EMAIL}. ` +
          `No EU representative has been appointed under Article 27 GDPR, because the controller is established in the European Union.`,
      },
      {
        title: "3. Data Protection Officer (DPO)",
        body:
          "No Data Protection Officer has been appointed, because processing does not fall within the mandatory cases in Article 37 GDPR (we are not a public authority, we do not carry out large-scale regular and systematic monitoring, and we do not process special categories or criminal-offence data on a large scale).",
      },
      {
        title: "4. Categories of personal data processed",
        body:
          "We process only data needed for the service, in line with data minimisation and purpose limitation (Article 5 GDPR). These categories match what the app actually collects:",
        items: [
          "Identification and contact data: email address, hashed password (handled by our authentication provider), display name (username), internal role (user or admin), and email-verification status.",
          "Google sign-in (only if you choose it): Google account identifier, name, and email that Google sends at authentication.",
          "Guest mode: an auto-generated display name and, if guest authentication is used, a technical non-real email (guest-…@guest.local). Guests do not appear on the leaderboard and cannot submit community questions.",
          "Learning profile: Italian proficiency level (CEFR), target language (Italian), sound and haptic preferences.",
          "Gameplay data: statistics, seen questions, match history, scores, result (win/loss/tie), opponent type, mistakes and mistake-practice progress, and in-progress session answers and scores.",
          "Ghost matches: answers from a completed match may be reused for an automatic opponent. The interface shows a generic name («Ghost Opponent»), not the original user’s username.",
          "Leaderboard: for registered accounts, display name and PvP results (matches, wins, win rate, points) visible to other authenticated users.",
          "Reports and contributions: the type of issue reported on a question; submitted question text, options, correct answer, optional rationale, and reviewer notes.",
          "Artificial intelligence (only on request): question text, the correct option text, the selected option text, and the generated «Ask AI» explanation; a per-match count of AI requests; and, for community submissions, an automatic pre-check (advisory only for a human reviewer).",
          "Push notifications (only if enabled): subscription endpoint, technical keys (p256dh and auth), browser user-agent, IANA timezone, preferred daily reminder hour, and last-sent timestamp.",
          "Authentication and security technical data: session cookies and tokens, and IP address / user-agent that may appear in hosting technical logs, with access timestamps.",
          "Device storage: sound/volume/haptics preferences, colour theme, local match state, and short-lived navigation data (see the cookies section).",
        ],
      },
      {
        title: "5. Source of the data (Articles 13 and 14 GDPR)",
        body: "Data comes from these sources:",
        items: [
          "Data you provide: registration, onboarding, settings, matches, reports, submissions, «Ask AI» requests, and enabling notifications.",
          "Data generated by the service: scores, statistics, leaderboard, game sessions, AI pre-checks of submissions, and security logs.",
          "Data from third parties: if you use «Sign in with Google», Google LLC sends the account data needed for authentication. Google processes its own account data as an independent controller, under its own notice.",
          "We do not buy contact lists or collect public-source data to profile users.",
        ],
      },
      {
        title: "6. Special categories and criminal-offence data",
        body:
          "We do not intentionally collect special-category data under Article 9 GDPR (racial or ethnic origin, political opinions, religious or philosophical beliefs, trade-union membership, genetic data, biometric data, health data, or data concerning sex life or sexual orientation) or criminal-offence data under Article 10 GDPR and Article 2-octies of the Codice privacy. Please do not put such data in question or report text.",
      },
      {
        title: "7. Purposes, legal bases, and retention periods",
        body:
          "For each purpose we state the legal basis (Article 6 GDPR) and the retention period (Article 13(2)(a) GDPR):",
        items: [
          "Account creation and management (email, credentials, username, profile): performance of a contract or pre-contractual steps, Article 6(1)(b) GDPR; kept for as long as the account is active.",
          "Email verification and password reset: performance of a contract, Article 6(1)(b); links expire after a short technical period.",
          "Google sign-in: performance of a contract, Article 6(1)(b), and, for Google cookies/scripts needed for that login, Article 122(1), second sentence, Codice privacy (strictly necessary for the service you requested).",
          "Guest mode: performance of a contract, Article 6(1)(b); kept for the guest session or until conversion to a registered account.",
          "Matches, leaderboards, statistics, mistake practice, ghost matches, and session state: performance of a contract, Article 6(1)(b); kept for as long as the account is active. Ghost data may be used for matchmaking while the account remains active.",
          "Sound, haptics, and theme preferences: performance of a contract, Article 6(1)(b); they remain on the device until you clear them.",
          "Reporting incorrect or ambiguous questions: legitimate interest in keeping learning content accurate (Article 6(1)(f)); the interest is question quality for all users, with limited impact on the reporter (we keep the issue type and reporter id); kept until the report is resolved, and in any event no longer than 24 months.",
          "Community question submissions: performance of a contract, Article 6(1)(b); kept until review; if approved, the question remains in the game pool (without exposing the submitter’s email to other players).",
          "«Ask AI» explanations: consent, Article 6(1)(a), given by the specific request; generated explanations may be stored in a shared cache per question/answer pair in non-nominative form; per-match request counts are kept for the life of the account. You withdraw consent by no longer using the feature.",
          "Automatic pre-check of submissions: performance of a contract, Article 6(1)(b), and, as use of an AI system, in line with Article 4 of Law 132/2025 (clear information and the option not to use submissions). A human admin always makes the final decision; this is not automated decision-making under Article 22 GDPR.",
          "Daily push reminders: consent, Article 6(1)(a) GDPR, given by enabling the feature in Settings and granting the browser permission. Article 122 Codice privacy also applies (storing the push subscription on the device) and, because the message nudges you back into the app, Article 130 Codice privacy (electronic communications: prior, free, specific, informed, and documented consent). Kept until you disable reminders or delete the account.",
          "Security, abuse prevention, and technical operation: legitimate interest, Article 6(1)(f); technical logs as a rule for up to 90 days, unless a longer legal retention applies.",
          "Compliance with legal obligations (for example responding to a competent authority): Article 6(1)(c) GDPR.",
        ],
      },
      {
        title: "8. Whether data is required and consequences of refusal",
        body:
          "Providing email and password (or a Google account) and, in guest mode, Italian proficiency level is necessary to enter into the contract and use the service (Article 13(2)(e) GDPR). Refusal prevents account creation or access to matches. A custom username, reports, community submissions, «Ask AI», and push notifications are optional; not using them does not block core play, but limits the related features. Service messages (email verification, password reset) are required to operate the account and are not promotional.",
      },
      {
        title: "9. Recipients and processors",
        body:
          "Data may be shared, within the purposes above, with parties that process it on our behalf as processors under Article 28 GDPR, bound by a data-processing agreement, or, in specific cases, with independent controllers:",
        items: [
          `Supabase Inc. — database, authentication, and application-data hosting (${SUPABASE_PRIVACY_URL}).`,
          `Vercel Inc. — web application hosting (${VERCEL_PRIVACY_URL}).`,
          `Groq Inc. — «Ask AI» explanations and submission pre-checks, only if you use those features (${GROQ_PRIVACY_URL}).`,
          `Google LLC — «Sign in with Google», only if you choose it. Google is an independent controller for its own account processing (${GOOGLE_PRIVACY_URL}).`,
          "Browser/OS push services (for example Apple, Google FCM, or Mozilla, depending on the device) — delivery of notifications, only if enabled.",
          "Public authorities, where required by law.",
        ],
      },
      {
        title: "10. Transfers to third countries",
        body:
          "Some providers may process data outside the European Economic Area, including the United States. Transfers take place under Articles 44–49 GDPR, on the basis of a European Commission adequacy decision (including the EU–US Data Privacy Framework where the importer is certified) and/or Standard Contractual Clauses (SCCs) approved by the Commission, plus supplementary safeguards adopted by the providers. Copies of the applicable safeguards may be requested at " +
          PRIVACY_CONTACT_EMAIL +
          ".",
      },
      {
        title: "11. Cookies and other device storage (Article 122 Codice privacy)",
        body:
          "Under Article 122 of the Codice privacy and the Garante guidelines of 10 June 2021, storing information on a device or accessing information already stored is allowed without consent only if it is technical — strictly necessary to transmit a communication or to provide the service you requested. Italiarena does not use profiling, advertising, or audience-measurement cookies. A cookie-consent banner is therefore not required. The tools we use are:",
        table: {
          headers: ["Tool", "Type", "Purpose", "Retention", "Party"],
          rows: [
            [
              "Supabase session cookies (sb- prefix, authentication token)",
              "Technical",
              "Keep you securely signed in",
              "Until the session token expires or is refreshed",
              "First party, via the authentication provider",
            ],
            [
              "PKCE / code-verifier cookie or storage for sign-in",
              "Technical",
              "Complete the login or OAuth flow securely",
              "Session or short technical duration",
              "First party",
            ],
            [
              "localStorage language-quiz-game",
              "Technical (local storage)",
              "Local match state on the device",
              "Until you clear it",
              "First party",
            ],
            [
              "localStorage lq-gameplay-preferences",
              "Technical",
              "Volume, sound, and haptic feedback",
              "Until you clear it",
              "First party",
            ],
            [
              "Colour-theme localStorage",
              "Technical",
              "Remember light or dark theme",
              "Until you clear it",
              "First party",
            ],
            [
              "sessionStorage (matchmaking intent, load-error recovery)",
              "Technical",
              "Navigation and app stability",
              "End of the browser session",
              "First party",
            ],
            [
              "Service worker and Web Push subscription",
              "Technical, enabled only with notification consent",
              "Deliver the reminders you chose",
              "Until you unsubscribe or delete the account",
              "First party and the browser push service",
            ],
            [
              "Google Identity Services (sign-in page script)",
              "Third-party authentication technical tool",
              "Google authentication. The script loads when the sign-in page opens, if the feature is enabled, not only after you tap the button.",
              "According to Google’s settings and privacy notice",
              "Google LLC",
            ],
          ],
        },
        items: [
          "If Google sign-in is configured, the sign-in page loads the Google Identity Services script when it opens. Google may store cookies on its own domain at that point, not only after you tap «Sign in with Google».",
          "You can delete cookies and local data in your browser settings; you may then need to sign in again.",
          "We do not use Google Analytics, advertising pixels, tracking social plugins, or similar tools.",
        ],
      },
      {
        title: "12. Electronic communications and push notifications (Article 130 Codice privacy)",
        body:
          "Under Article 130 of the Codice privacy we do not send promotional communications, newsletters, or advertising by email, phone, or automated systems without prior free, specific, informed, and documented consent. We do not rely on the «soft spam» exception in Article 130(4). The service sends only: (i) messages strictly necessary for the account (email verification, password reset); (ii) daily push reminders, only if you enable them in Settings, grant the browser permission, and can turn them off at any time. Reminders are not used for commercial profiling.",
      },
      {
        title: "13. Artificial-intelligence systems",
        body:
          "Italiarena uses third-party AI systems (models hosted by Groq) in two optional cases, both with human oversight, in line with Articles 3 and 4 of Italian Law no. 132 of 23 September 2025 and the transparency principles of Regulation (EU) 2024/1689:",
        items: [
          "«Ask AI»: on an explicit request, the question text, the correct option text, and the selected option text are sent to the provider to generate an educational explanation in English. We do not send your name, email, the full option list, or other contact details in the prompt. You can simply not request explanations.",
          "Submission pre-check: if you submit a community question, an AI model gives a non-binding opinion (for example on language, CEFR level, and category). A human administrator decides whether to approve or reject. This is not solely automated decision-making with legal or similarly significant effects (Article 22 GDPR).",
          "Italiarena does not use AI-sent data to train its own models. The provider processes the data under its contract and privacy notice.",
          "AI features, like the rest of the service, are for users aged 14 and over. Under-14s would need consent from the holder of parental responsibility (Article 2-quinquies Codice privacy and Article 4(4) of Law 132/2025); the service is not intended for that age group.",
        ],
      },
      {
        title: "14. Automated decision-making and profiling",
        body:
          "We do not carry out automated decision-making that produces legal effects or similarly significantly affects you under Article 22 GDPR. Matchmaking is based on declared Italian proficiency solely to organise fair matches, without commercial profiling. We do not sell or share personal data with third parties for marketing.",
      },
      {
        title: "15. Security measures",
        body:
          "We apply appropriate technical and organisational measures under Article 32 GDPR and privacy by design / by default (Article 25 GDPR), including encryption in transit (HTTPS/TLS), credential handling through our authentication provider (passwords not stored in plain text), restricted access to production data, contracts with processors, and account deletion on request.",
      },
      {
        title: "16. Your rights",
        body:
          `Under Articles 15–22 GDPR and the Codice privacy, you have the right of access, rectification, erasure, restriction, objection (where applicable, in particular for legitimate-interest processing), and data portability, and to withdraw consent for «Ask AI» and push notifications without affecting processing that already took place. You can update your profile in Settings, delete your account at any time, or write to ${PRIVACY_CONTACT_EMAIL}. We respond within one month, extendable by two further months in complex cases, under Article 12(3) GDPR. Exercising these rights is in principle free of charge (Article 12(5)).`,
      },
      {
        title: "17. Rights relating to deceased persons (Article 2-terdecies Codice privacy)",
        body:
          "Rights under Articles 15–22 GDPR relating to personal data of deceased persons may be exercised by someone with their own interest, acting to protect the data subject as a representative, or for family reasons meriting protection, subject to legal limits and any express, specific, and informed prohibition by the data subject, as provided by Article 2-terdecies. Send such requests to " +
          PRIVACY_CONTACT_EMAIL +
          ".",
      },
      {
        title: "18. Right to lodge a complaint and judicial protection",
        body:
          `You may lodge a complaint with the ${ITALIAN_DPA_NAME} under Article 77 GDPR and Article 141 of the Codice privacy, or bring proceedings before the ordinary courts under Articles 78 and 79 GDPR and Article 152 of the Codice privacy. A complaint does not affect any other administrative or judicial remedy.`,
        items: [
          `Website: ${ITALIAN_DPA_URL}`,
          `How to lodge a complaint: ${ITALIAN_DPA_COMPLAINT_URL}`,
          `Address: ${ITALIAN_DPA_ADDRESS}`,
          `Telephone: ${ITALIAN_DPA_PHONE}`,
          `PEC: ${ITALIAN_DPA_PEC}`,
        ],
      },
      {
        title: "19. Children",
        body:
          `The service is intended for users aged ${MINIMUM_AGE_ITALY} and over, in line with Article 8 GDPR and Article 2-quinquies of the Codice privacy (age of consent for information-society services in Italy) and, for AI features, Article 4(4) of Law 132/2025. We do not knowingly collect personal data from anyone under ${MINIMUM_AGE_ITALY}. If you believe a minor provided data without valid consent from the holder of parental responsibility, contact ${PRIVACY_CONTACT_EMAIL} and we will delete it without undue delay.`,
      },
      {
        title: "20. Account deletion and residual retention",
        body:
          "When you delete your account from Settings, we erase your profile, statistics, match history, mistakes, push subscriptions, «Ask AI» logs linked to you, and other linked personal data without undue delay. Residual copies may remain in encrypted backups for a limited technical period (up to 30 days) before automatic deletion. AI explanations stored in a shared cache per question/answer and already-approved community questions may be kept in anonymised or non-identifiable form. Data strictly needed to defend legal claims or to meet Italian legal obligations may be kept for the time required by law.",
      },
      {
        title: "21. Changes to this notice",
        body:
          "We may update this notice to reflect changes to the service or applicable law. The updated date appears at the top of this page. For material changes, we will provide a clear notice in the app where appropriate.",
      },
    ],
  };
}

const PRIVACY_COPY: Record<PrivacyLocale, PrivacyCopy> = {
  it: buildItalianCopy(),
  en: buildEnglishCopy(),
};

export function getPrivacyCopy(locale: PrivacyLocale): PrivacyCopy {
  return PRIVACY_COPY[locale];
}

/** Short notice for English footers and auth screens. */
export const PRIVACY_FOOTER_NOTICE =
  "Data processing in compliance with the GDPR and the Italian Privacy Code (Legislative Decree 196/2003).";

/** Short notice for the settings privacy card. */
export const PRIVACY_SETTINGS_SUMMARY = [
  "We collect only data needed to run the app (account, gameplay, optional AI help, optional push reminders), as listed in our Italian privacy notice (Arts. 13–14 GDPR and the Codice privacy).",
  "Data is stored securely (HTTPS), never sold, and not used for promotional emails (Art. 130 Codice privacy). We use only technical cookies for login and the app (Art. 122 Codice privacy).",
  "You can update your profile in Settings, delete your account at any time, or contact us to exercise your rights. You may also lodge a complaint with the Garante per la protezione dei dati personali.",
] as const;
