/** Legal and privacy copy shared across the app (Italy / GDPR / Codice privacy). */

export const APP_NAME = "Italiarena";
export const APP_LEGAL_NAME = APP_NAME;
export const APP_WEBSITE = "https://italiarena.com";

export const SUPPORT_EMAIL = "support@italiarena.com";

/** Privacy and data-protection requests (same inbox as general support). */
export const PRIVACY_CONTACT_EMAIL = SUPPORT_EMAIL;

export const PRIVACY_POLICY_LAST_UPDATED = "30 giugno 2026";

/** Minimum age to use the service in Italy (art. 2-quinquies Codice privacy). */
export const MINIMUM_AGE_ITALY = 14;

export const ITALIAN_DPA_NAME =
  "Garante per la protezione dei dati personali";

export const ITALIAN_DPA_URL = "https://www.garanteprivacy.it";

export const ITALIAN_DPA_ADDRESS = "Piazza Venezia 11, 00187 Roma";

export const ITALIAN_DPA_PEC = "protocollo@pec.gpdp.it";

export const PRIVACY_POLICY_TITLE = "Informativa privacy";

export const PRIVACY_POLICY_SUBTITLE = `${APP_LEGAL_NAME} · Ultimo aggiornamento: ${PRIVACY_POLICY_LAST_UPDATED} · Italia`;

export const PRIVACY_POLICY_INTRO =
  "La presente informativa è resa ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679 (" +
  "«GDPR») e del Codice in materia di protezione dei dati personali (D.Lgs. 30 giugno 2003, n. 196, " +
  "come modificato dal D.Lgs. 10 agosto 2018, n. 101, di seguito «Codice privacy») agli utenti del " +
  "servizio Italiarena residenti o presenti in Italia. Il testo è redatto in linguaggio chiaro e " +
  "accessibile, come richiesto dagli artt. 12–14 GDPR e dalle Linee guida sulla trasparenza del " +
  "Gruppo di lavoro Articolo 29 (rev. 1, aprile 2018).";

export type PrivacyPolicySection = {
  title: string;
  body: string;
  items?: readonly string[];
};

export const PRIVACY_POLICY_SECTIONS: readonly PrivacyPolicySection[] = [
  {
    title: "1. Titolare del trattamento",
    body:
      `Il titolare del trattamento è l'operatore del servizio ${APP_LEGAL_NAME} ` +
      `(sito web: ${APP_WEBSITE}). Per qualsiasi richiesta relativa ai dati personali è possibile ` +
      `contattare il titolare all'indirizzo e-mail ${PRIVACY_CONTACT_EMAIL}.`,
  },
  {
    title: "2. Responsabile della Protezione dei Dati (RPD/DPO)",
    body:
      "Non è stato designato un Responsabile della Protezione dei Dati (RPD/DPO), in quanto il " +
      "trattamento non rientra nei casi di obbligo previsti dall'art. 37 GDPR.",
  },
  {
    title: "3. Categorie di dati personali trattati",
    body: "Trattiamo le seguenti categorie di dati, limitatamente a quanto necessario per il servizio:",
    items: [
      "Dati identificativi e di contatto: indirizzo e-mail, nome visualizzato (username) o nome generato automaticamente in modalità ospite.",
      "Dati di profilo e preferenze: livello di competenza in italiano (CEFR), lingua di destinazione, impostazioni audio e feedback aptico.",
      "Dati di gioco: statistiche, cronologia partite, punteggi, errori commessi e progressi nella pratica degli errori, posizione in classifica (per utenti registrati).",
      "Dati relativi a segnalazioni e contributi: contenuto delle segnalazioni su domande errate o ambigue e domande inviate alla community.",
      "Dati relativi alle funzioni di intelligenza artificiale: testo delle domande, risposte selezionate e spiegazioni generate quando l'utente richiede esplicitamente «Ask AI».",
      "Dati tecnici di autenticazione: cookie e token di sessione necessari per l'accesso sicuro, gestiti dal nostro fornitore di autenticazione.",
    ],
  },
  {
    title: "4. Finalità, basi giuridiche e periodi di conservazione",
    body:
      "Per ciascuna finalità indichiamo la base giuridica ai sensi dell'art. 6 GDPR e il periodo " +
      "di conservazione, come richiesto dagli artt. 13(1)(c) e 13(2)(a) GDPR:",
    items: [
      "Creazione e gestione dell'account (e-mail, credenziali, profilo): base giuridica — esecuzione del contratto o misure precontrattuali (art. 6, par. 1, lett. b) GDPR); conservazione — per tutta la durata dell'account.",
      "Modalità ospite (sessione anonima, nome generato, livello di competenza): base giuridica — esecuzione del contratto (art. 6, par. 1, lett. b) GDPR); conservazione — per la durata della sessione ospite o fino alla conversione in account registrato.",
      "Svolgimento di partite, classifiche e statistiche: base giuridica — esecuzione del contratto (art. 6, par. 1, lett. b) GDPR); conservazione — per tutta la durata dell'account.",
      "Pratica degli errori e revisione post-partita: base giuridica — esecuzione del contratto (art. 6, par. 1, lett. b) GDPR); conservazione — per tutta la durata dell'account.",
      "Segnalazione di domande problematiche: base giuridica — legittimo interesse del titolare a garantire la qualità dei contenuti (art. 6, par. 1, lett. f) GDPR); l'interesse consiste nel mantenere domande corrette e utili per tutti gli utenti, con impatto minimo sull'interessato; conservazione — fino alla risoluzione della segnalazione e, al massimo, 24 mesi.",
      "Invio di domande alla community: base giuridica — esecuzione del contratto (art. 6, par. 1, lett. b) GDPR); conservazione — fino alla revisione amministrativa; se approvata, i dati restano nel pool delle domande.",
      "Spiegazioni tramite intelligenza artificiale («Ask AI»): base giuridica — consenso dell'interessato manifestato con la richiesta esplicita (art. 6, par. 1, lett. a) GDPR); conservazione — le spiegazioni generate possono essere memorizzate in cache condivisa per domanda/risposta; i log di utilizzo per utente e sessione sono conservati per la durata dell'account.",
      "Sicurezza, prevenzione abusi e funzionamento tecnico del servizio: base giuridica — legittimo interesse del titolare (art. 6, par. 1, lett. f) GDPR); conservazione — log tecnici per un massimo di 90 giorni, salvo obblighi di legge.",
    ],
  },
  {
    title: "5. Natura del conferimento dei dati e conseguenze del rifiuto",
    body:
      "Il conferimento dei dati contrassegnati come obbligatori in fase di registrazione (e-mail e " +
      "password) o di avvio della modalità ospite (livello di competenza) è necessario per concludere " +
      "il contratto e utilizzare il servizio. Il mancato conferimento impedisce la creazione dell'account " +
      "o l'accesso alle partite. Il nome visualizzato, le segnalazioni, i contributi alla community e " +
      "l'uso di «Ask AI» sono facoltativi; il loro mancato utilizzo non impedisce l'uso principale del " +
      "servizio, ma limita le funzionalità corrispondenti.",
  },
  {
    title: "6. Destinatari e responsabili del trattamento",
    body:
      "I dati possono essere comunicati a soggetti che trattano per nostro conto in qualità di " +
      "responsabili del trattamento ai sensi dell'art. 28 GDPR, vincolati da accordi di trattamento:",
    items: [
      "Supabase Inc. — database, autenticazione e hosting dei dati applicativi.",
      "Vercel Inc. — hosting dell'applicazione web.",
      "Groq Inc. — generazione opzionale di spiegazioni didattiche quando l'utente richiede «Ask AI».",
    ],
  },
  {
    title: "7. Trasferimenti di dati verso paesi terzi",
    body:
      "Alcuni fornitori sopra elencati possono trattare dati al di fuori dello Spazio economico europeo " +
      "(SEE), in particolare negli Stati Uniti d'America. In tali casi il trasferimento avviene nel " +
      "rispetto degli artt. 44–49 GDPR, sulla base di decisioni di adeguatezza della Commissione " +
      "europea e/o Clausole contrattuali standard (SCC) approvate dalla Commissione europea, nonché " +
      "delle garanzie supplementari adottate dai fornitori. Copie delle garanzie applicabili possono " +
      "essere richieste a " +
      PRIVACY_CONTACT_EMAIL +
      ".",
  },
  {
    title: "8. Processi decisionali automatizzati e profilazione",
    body:
      "Non effettuiamo processi decisionali automatizzati che producano effetti giuridici o incidano in " +
      "modo analogo significativamente sull'interessato ai sensi dell'art. 22 GDPR. L'abbinamento tra " +
      "giocatori avviene in base al livello di competenza dichiarato, esclusivamente per organizzare " +
      "partite equilibrate, senza profilazione a fini commerciali. Non vendiamo né cediamo a terzi i " +
      "dati personali per finalità di marketing.",
  },
  {
    title: "9. Comunicazioni promozionali",
    body:
      "Ai sensi dell'art. 130 del Codice privacy, non inviamo comunicazioni promozionali, newsletter o " +
      "messaggi pubblicitari tramite e-mail, telefono o sistemi automatizzati senza il previo consenso " +
      "libero, specifico, informato e documentato dell'interessato. Il servizio invia esclusivamente " +
      "comunicazioni strettamente necessarie al funzionamento dell'account e del servizio.",
  },
  {
    title: "10. Misure di sicurezza",
    body:
      "Adottiamo misure tecniche e organizzative adeguate ai sensi dell'art. 32 GDPR, tra cui " +
      "crittografia in transito (HTTPS/TLS), gestione sicura delle credenziali tramite il fornitore di " +
      "autenticazione (password non conservate in chiaro), accesso limitato ai dati di produzione e " +
      "accordi contrattuali con i responsabili del trattamento.",
  },
  {
    title: "11. Diritti dell'interessato",
    body:
      `Ai sensi degli artt. 15–22 GDPR e del Codice privacy, l'interessato ha diritto di accesso, ` +
      `rettifica, cancellazione, limitazione del trattamento, opposizione (ove applicabile) e ` +
      `portabilità dei dati. Quando il trattamento si basa sul consenso (ad esempio «Ask AI»), è ` +
      `possibile revocare il consenso in qualsiasi momento senza pregiudicare la liceità del ` +
      `trattamento basato sul consenso prestato prima della revoca. È possibile aggiornare il profilo ` +
      `dalle Impostazioni, eliminare l'account in qualsiasi momento o scrivere a ${PRIVACY_CONTACT_EMAIL}. ` +
      `Rispondiamo entro un mese dal ricevimento della richiesta, prorogabile di ulteriori due mesi ` +
      `nei casi complessi, come previsto dall'art. 12, par. 3, GDPR.`,
  },
  {
    title: "12. Diritto di reclamo al Garante",
    body:
      `L'interessato ha il diritto di proporre reclamo al ${ITALIAN_DPA_NAME} ai sensi dell'art. 77 ` +
      `GDPR e degli artt. 140-bis e seguenti del Codice privacy, qualora ritenga che il trattamento ` +
      `violi la normativa applicabile.`,
    items: [
      `Sito web: ${ITALIAN_DPA_URL}`,
      `Indirizzo: ${ITALIAN_DPA_ADDRESS}`,
      `PEC: ${ITALIAN_DPA_PEC}`,
    ],
  },
  {
    title: "13. Minori",
    body:
      `Il servizio è destinato a utenti di età pari o superiore a ${MINIMUM_AGE_ITALY} anni, in linea ` +
      `con l'art. 8 GDPR e l'art. 2-quinquies del Codice privacy (età del consenso per i servizi ` +
      `della società dell'informazione in Italia). Non raccogliamo consapevolmente dati personali di ` +
      `minori di ${MINIMUM_AGE_ITALY} anni. Se ritieni che un minore abbia fornito dati senza valido ` +
      `consenso del titolare della responsabilità genitoriale, contattaci a ${PRIVACY_CONTACT_EMAIL} ` +
      `e provvederemo alla cancellazione senza ingiustificato ritardo.`,
  },
  {
    title: "14. Cancellazione dell'account e conservazione residua",
    body:
      "Eliminando l'account dalle Impostazioni, cancelliamo senza ingiustificato ritardo il profilo, " +
      "le statistiche, la cronologia delle partite e gli altri dati personali collegati. Copie residue " +
      "possono permanere in backup crittografati per un periodo tecnico limitato (fino a 30 giorni) " +
      "prima della cancellazione automatica. Le spiegazioni IA memorizzate in cache condivisa per " +
      "domanda/risposta possono essere conservate in forma anonimizzata o non riconducibile all'utente.",
  },
  {
    title: "15. Modifiche all'informativa",
    body:
      "Possiamo aggiornare la presente informativa per riflettere modifiche del servizio o della " +
      "normativa applicabile. Pubblicheremo la data di aggiornamento in cima a questa pagina. In caso " +
      "di modifiche sostanziali, forniremo un avviso chiaro nell'app ove opportuno.",
  },
] as const;

/** Short notice for footers and auth screens (Italian, per Garante transparency rules). */
export const PRIVACY_FOOTER_NOTICE =
  "Trattamento dei dati conforme al GDPR e al Codice privacy italiano (D.Lgs. 196/2003).";

/** Short notice for the settings privacy card (English UI, Italian law references). */
export const PRIVACY_SETTINGS_SUMMARY = [
  "We collect only data needed to run the app, as listed in our privacy notice (art. 13 GDPR).",
  "Data is stored securely (HTTPS), never sold, and not used for promotional communications (art. 130 Codice privacy).",
  "You can update your profile in Settings, delete your account at any time, or contact us to exercise your rights under the GDPR and Italian privacy law.",
] as const;
