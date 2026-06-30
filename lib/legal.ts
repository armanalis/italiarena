/** Legal and privacy copy shared across the app (Italy / GDPR). */
export const APP_NAME = "Italiarena";
export const APP_LEGAL_NAME = APP_NAME;

export const SUPPORT_EMAIL = "support@italiarena.com";

/** Privacy and data-protection requests (same inbox as general support). */
export const PRIVACY_CONTACT_EMAIL = SUPPORT_EMAIL;

export const PRIVACY_POLICY_LAST_UPDATED = "30 giugno 2026";

/** Minimum age for consent to information-society services in Italy (art. 2-quinquies Codice Privacy). */
export const MINIMUM_AGE_ITALY = 14;

export const ITALIAN_DPA_NAME =
  "Garante per la protezione dei dati personali";

export const ITALIAN_DPA_URL = "https://www.garanteprivacy.it";

export const ITALIAN_DPA_ADDRESS =
  "Piazza Venezia 11, 00187 Roma, Italia";

export const PRIVACY_POLICY_INTRO = `La presente informativa è resa ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679 («GDPR») e del Codice in materia di protezione dei dati personali (d.lgs. 196/2003, come modificato dal d.lgs. 101/2018, «Codice Privacy»), a coloro che utilizzano il servizio ${APP_LEGAL_NAME} in Italia. Il servizio è un'applicazione web per l'apprendimento dell'italiano tramite quiz e partite live.`;

export const PRIVACY_POLICY_SECTIONS = [
  {
    title: "1. Titolare del trattamento e contatti",
    body: `Il titolare del trattamento è il gestore del servizio ${APP_LEGAL_NAME}, con sede in Italia, contattabile all'indirizzo e-mail ${PRIVACY_CONTACT_EMAIL}.

Non è stato nominato un Responsabile della protezione dei dati (DPO) ai sensi dell'art. 37 GDPR, in quanto non ricorrono, allo stato attuale, i casi di obbligo di nomina previsti dalla normativa.

Per qualsiasi richiesta relativa ai tuoi dati personali — inclusi accesso, rettifica, cancellazione, limitazione, opposizione, portabilità o revoca del consenso — puoi scrivere a ${PRIVACY_CONTACT_EMAIL}. Risponderemo entro i termini di legge (di regola un mese, prorogabile di due mesi in casi complessi, ai sensi dell'art. 12 GDPR).`,
  },
  {
    title: "2. Tipologie di dati personali trattati",
    body: `In relazione all'utilizzo del servizio possiamo trattare le seguenti categorie di dati:

• Dati identificativi e di contatto: indirizzo e-mail; username scelto dall'utente; per gli ospiti (guest), nome generato automaticamente.
• Dati di autenticazione: credenziali gestite dal nostro fornitore di autenticazione (password non conservata in chiaro da noi); eventuali dati collegati all'accesso tramite Google, se scegli tale modalità.
• Dati di profilo e gioco: livello di italiano (CEFR), preferenze dell'app (es. audio, feedback aptico), statistiche di gioco, cronologia partite, errori da ripassare, posizione in classifica.
• Dati tecnici: indirizzo IP, log di sistema e di sicurezza, identificativi di sessione, cookie tecnici necessari al funzionamento (vedi sezione dedicata).
• Dati facoltativi: segnalazioni di domande errate; contenuti inviati volontariamente alla funzione «Ask AI» (testo della domanda, risposte e categoria).

Non trattiamo categorie particolari di dati (art. 9 GDPR) né dati relativi a condanne penali (art. 10 GDPR), salvo eventuali contenuti che tu inserisca spontaneamente nei campi liberi, che ti invitiamo a non comunicare.`,
  },
  {
    title: "3. Finalità, basi giuridiche e periodi di conservazione",
    body: `Trattiamo i dati personali solo per finalità determinate, esplicite e legittime:

• Creazione e gestione dell'account, erogazione del servizio (partite, classifiche, statistiche, onboarding): base giuridica esecuzione del contratto o misure precontrattuali (art. 6, par. 1, lett. b, GDPR). Conservazione: per tutta la durata dell'account.
• Modalità ospite (guest): base giuridica esecuzione del contratto / legittimo interesse a offrire prova del servizio senza registrazione (art. 6, par. 1, lett. b e f). Conservazione: per la sessione e per il tempo strettamente necessario alle finalità del servizio.
• Sicurezza, prevenzione abusi, gestione tecnica e difesa in giudizio: legittimo interesse del titolare (art. 6, par. 1, lett. f, GDPR), nel rispetto del test di bilanciamento. Conservazione: per il tempo necessario alle finalità di sicurezza e, ove applicabile, per i termini di prescrizione.
• Gestione segnalazioni su domande e contributi della community: esecuzione del contratto e/o legittimo interesse alla qualità del servizio. Conservazione: per il tempo necessario alla gestione della segnalazione e alla tutela del servizio.
• Funzione «Ask AI» (solo se la attivi): consenso dell'interessato (art. 6, par. 1, lett. a, GDPR). Puoi non usarla o smettere di usarla in qualsiasi momento; la revoca non pregiudica la liceità del trattamento basato sul consenso prestato prima della revoca. Conservazione: i dati inviati al fornitore AI per la singola richiesta sono trattati per generare la risposta e non sono conservati da noi oltre quanto necessario al funzionamento della funzione e ai log tecnici minimi.
• Adempimenti di obblighi di legge: art. 6, par. 1, lett. c, GDPR. Conservazione: secondo i termini di legge applicabili.

Se elimini l'account dalle Impostazioni, cancelliamo senza ingiustificato ritardo profilo, statistiche, cronologia partite e altri dati personali collegati, salvo copie residue in backup crittografati per un limitato periodo tecnico prima della cancellazione automatica, e salvo conservazione richiesta da obblighi di legge.`,
  },
  {
    title: "4. Natura del conferimento e conseguenze del rifiuto",
    body: `Il conferimento di e-mail, username e password è necessario per creare un account registrato e utilizzare le funzioni collegate (classifica, statistiche persistenti, contributi, ecc.). Senza tali dati non è possibile registrarsi, salvo l'uso della modalità ospite limitata al solo livello di italiano.

Il conferimento del livello di italiano è necessario per il matchmaking e l'erogazione del servizio.

L'uso di Google per l'accesso, delle segnalazioni, della funzione «Ask AI» e di altre funzioni facoltative è libero: il mancato conferimento non impedisce l'uso delle funzioni essenziali del servizio, ma rende non disponibili le funzioni collegate.`,
  },
  {
    title: "5. Destinatari e responsabili del trattamento",
    body: `I dati possono essere comunicati a soggetti che trattano per nostro conto in qualità di responsabili del trattamento (art. 28 GDPR), adeguatamente vincolati contrattualmente:

• Supabase, Inc. — database, autenticazione e gestione account.
• Vercel, Inc. — hosting dell'applicazione web e distribuzione dei contenuti.
• Groq, Inc. — elaborazione facoltativa delle richieste «Ask AI», solo quando l'utente le avvia.
• Google LLC / Google Ireland Limited — se scegli l'accesso tramite account Google, per l'autenticazione OAuth.

Personale autorizzato del titolare può accedere ai dati per finalità di assistenza, sicurezza e manutenzione, nel rispetto del principio di minimizzazione.

Non vendiamo né cediamo a terzi i tuoi dati personali per finalità di marketing.`,
  },
  {
    title: "6. Trasferimenti verso Paesi terzi",
    body: `Alcuni fornitori sopra elencati possono trattare dati in Paesi extra-SEE (in particolare Stati Uniti). Ove applicabile, il trasferimento avviene sulla base di:

• decisioni di adeguatezza della Commissione europea, ove esistenti;
• Clausole Contrattuali Standard (SCC) approvate dalla Commissione europea (art. 46 GDPR);
• altre garanzie previste dal GDPR.

Puoi richiedere informazioni sulle garanzie applicate scrivendo a ${PRIVACY_CONTACT_EMAIL}.`,
  },
  {
    title: "7. Cookie e tecnologie simili",
    body: `Il servizio utilizza esclusivamente cookie e storage locale strettamente necessari al funzionamento e alla sicurezza (cookie tecnici), quali quelli relativi alla sessione di autenticazione gestita da Supabase e allo stato locale del gioco nel browser.

Ai sensi delle Linee guida cookie e altri strumenti di tracciamento del Garante (provvedimento n. 231 del 10 giugno 2021), i cookie tecnici non richiedono consenso, ma devono essere descritti in questa informativa.

Non utilizziamo cookie di profilazione né cookie analytics di terze parti che richiedano il consenso preventivo. Qualora in futuro fossero introdotti strumenti di tracciamento non tecnici, aggiorneremo questa informativa e, ove richiesto, acquisiremo il consenso tramite apposito banner conforme alle indicazioni del Garante.`,
  },
  {
    title: "8. Processo decisionale automatizzato e profilazione",
    body: `Non effettuiamo processi decisionali automatizzati che producano effetti giuridici o incidano in modo analogo significativamente sulla tua persona ai sensi dell'art. 22 GDPR.

Il matchmaking per livello di italiano e le classifiche si basano su criteri deterministici legati al tuo livello dichiarato e ai risultati di gioco, senza profilazione marketing né valutazione automatizzata della personalità.`,
  },
  {
    title: "9. Misure di sicurezza",
    body: `Adottiamo misure tecniche e organizzative adeguate ai sensi dell'art. 32 GDPR, tra cui connessioni cifrate (HTTPS), gestione sicura delle credenziali tramite il fornitore di autenticazione, accesso limitato ai dati di produzione e backup crittografati.

Nessuna misura di sicurezza può garantire protezione assoluta; ti invitiamo a usare una password robusta e a non condividerla.`,
  },
  {
    title: "10. Diritti dell'interessato",
    body: `In qualità di interessato hai diritto, nei casi previsti dal GDPR e dal Codice Privacy, a:

• accesso (art. 15 GDPR);
• rettifica (art. 16 GDPR);
• cancellazione / «diritto all'oblio» (art. 17 GDPR);
• limitazione del trattamento (art. 18 GDPR);
• portabilità dei dati (art. 20 GDPR);
• opposizione al trattamento basato su legittimo interesse (art. 21 GDPR);
• revoca del consenso in qualsiasi momento, per i trattamenti fondati sul consenso (art. 7 GDPR), senza pregiudicare la liceità del trattamento precedente.

Puoi aggiornare profilo e preferenze dalle Impostazioni dell'app o scrivere a ${PRIVACY_CONTACT_EMAIL}.

Ai sensi dell'art. 2-terdecies del Codice Privacy, i diritti di cui agli artt. 15-22 GDPR possono essere esercitati, con le modalità ivi previste, anche da chi ha un interesse proprio o agisce a tutela dell'interessato, in relazione a dati di persone decedute, ove applicabile.

Hai inoltre il diritto di proporre reclamo all'${ITALIAN_DPA_NAME} (${ITALIAN_DPA_URL}), con sede in ${ITALIAN_DPA_ADDRESS}, o di adire l'autorità dello Stato membro in cui risiedi o lavori.`,
  },
  {
    title: "11. Minori",
    body: `Il servizio è destinato a utenti che abbiano almeno ${MINIMUM_AGE_ITALY} anni, in attuazione dell'art. 8 GDPR e dell'art. 2-quinquies del Codice Privacy (età del consenso per i servizi della società dell'informazione in Italia).

Per i minori di ${MINIMUM_AGE_ITALY} anni, ove il trattamento si basi sul consenso, questo deve essere prestato o autorizzato da chi esercita la responsabilità genitoriale.

Le informazioni rivolte ai minori sono redatte con linguaggio chiaro e semplice, come richiesto dall'art. 2-quinquies, comma 2, del Codice Privacy.

Non raccogliamo consapevolmente dati di minori di ${MINIMUM_AGE_ITALY} anni. Se ritieni che un minore ci abbia fornito dati senza un valido consenso, contattaci a ${PRIVACY_CONTACT_EMAIL}: provvederemo alla cancellazione con prontezza.`,
  },
  {
    title: "12. Modifiche all'informativa",
    body: `Possiamo aggiornare questa informativa per adeguarla a modifiche del servizio o della normativa applicabile. La data dell'ultimo aggiornamento è indicata in calce. In caso di modifiche sostanziali, forniremo un avviso chiaro nell'app ove appropriato.`,
  },
] as const;

/** Short Italian summary for footers and settings cards. */
export const PRIVACY_FOOTER_TEXT =
  "I tuoi dati sono trattati nel rispetto del GDPR e del Codice Privacy italiano.";
