import Link from "next/link";
import { Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_NAME, PRIVACY_CONTACT_EMAIL } from "@/lib/legal";

export function PrivacyDataCard() {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="mb-1 flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          <CardTitle>Privacy &amp; data</CardTitle>
        </div>
        <CardDescription>
          Come trattiamo i tuoi dati ai sensi del GDPR e del Codice Privacy
          italiano.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <ul className="list-inside list-disc space-y-2">
          <li>
            Raccogliamo solo i dati necessari al servizio (account, statistiche
            di gioco, cronologia partite e, se lo usi, segnalazioni o spiegazioni
            AI).
          </li>
          <li>
            I dati sono conservati in modo sicuro (HTTPS), non venduti a terzi;
            puoi esercitare i diritti previsti dal GDPR e dal Codice Privacy.
          </li>
          <li>
            Puoi aggiornare il profilo qui,{" "}
            <a href="#delete-account" className="text-primary underline-offset-4 hover:underline">
              eliminare l&apos;account
            </a>{" "}
            in qualsiasi momento o contattarci per accesso o rettifica.
          </li>
        </ul>

        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/privacy"
            className="inline-flex min-h-10 items-center rounded-lg border border-border/60 bg-muted/30 px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            Leggi l&apos;informativa completa
          </Link>
          <a
            href={`mailto:${PRIVACY_CONTACT_EMAIL}?subject=${encodeURIComponent(`${APP_NAME} — richiesta privacy`)}`}
            className="inline-flex min-h-10 items-center rounded-lg border border-border/60 px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted/30"
          >
            Contattaci sui miei dati
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
