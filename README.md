Unser Zeiterfassungs Tool im Auftrag von der GIBZ Schule.
Wir haben dieses Projekt im Rahmen des Modul 431 umgesetzt.

## Neue Funktionen einrichten

### Datenbank aktualisieren

Die Übersicht kann Einträge bearbeiten. Führe für eine bestehende Supabase-Datenbank im SQL Editor folgende Änderung aus (die restlichen SQL-Statements in `supabase/schema.sql` nicht erneut ausführen):

```sql
grant update on public.work_entries to authenticated;

drop policy if exists "Users can update their own work entries"
  on public.work_entries;

create policy "Users can update their own work entries"
  on public.work_entries
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Bei einer neuen Datenbank kann das vollständige `supabase/schema.sql` verwendet werden.

### Kontolöschung aktivieren

Das Löschen eines Kontos benötigt privilegierte Supabase-Rechte und wird deshalb nicht direkt im Browser ausgeführt. Installiere die Supabase CLI, melde dich am richtigen Supabase-Projekt an und deploye die Funktion:

```powershell
supabase login
supabase link --project-ref hpqdpdmkhnlskelhtqyb
supabase functions deploy delete-account
```

Die Edge Function verwendet die vom Supabase-Projekt bereitgestellten Umgebungsvariablen `SUPABASE_URL`, `SUPABASE_ANON_KEY` und `SUPABASE_SERVICE_ROLE_KEY`. Der angemeldete Nutzer wird anhand seines Zugriffstokens geprüft; gelöscht wird ausschließlich dessen eigenes Konto. Die vorhandene Fremdschlüsselbeziehung löscht seine Arbeitszeiteinträge automatisch mit.

Das Profil und der Vorschlag für den Mitarbeitenden-Namen werden in den Metadaten des angemeldeten Supabase-Kontos gespeichert. Die CSV-Funktion exportiert die aktuell gefilterten Einträge lokal im Browser.

Hier finden Sie noch unseren Plan:

1. Initialisierung
   Ziel: Rollenverteilung festlegen, Technologiewahl treffen und Zielsetzung klären.
   Team-Aufteilung (2er-Team):
   Person A: Zuständig für die Benutzeroberfläche und die Erfassung der Daten.
   Person B: Zuständig für die Berechnungslogik der Arbeitszeit und die Fehlererkennung.
   Technologiewahl: Entwicklungs- und Programmierumgebung auswählen und eine kurze Begründung für die spätere Demonstration festhalten.

2. Konzept
   Ziel: Datenstruktur, Berechnungslogik und Testbeispiele definieren.
   Anforderungen festlegen: Schnittstellen zur Erfassung von Name, Datum, Arbeitsbeginn, Arbeitsende und Pause (in Minuten) festlegen.
   Berechnungsformel: Formel zur Ermittlung der effektiven Arbeitszeit definieren:

"Effektive Arbeitszeit"=("Arbeitsende" -"Arbeitsbeginn" )-"Pause"
Fehlerbehandlung: Regeln für ungültige Eingaben definieren (z. B. Arbeitsende vor Arbeitsbeginn oder negative Pausenminuten).

    Testplanung: Konkrete Testdaten festlegen (z. B. Max Muster, 30.09.2026, 08:00 bis 17:00 Uhr, 60 Min. Pause = 8 Stunden Arbeitszeit).

3.  Realisierung
    Ziel: Pflichtfunktionen programmieren, Code integrieren und im Team überprüfen.
    Programmierung:
    Person A setzt die Eingabemaske für die Formulardaten sowie die Ergebnisanzeige um.
    Person B programmiert die mathematische Zeitberechnung und die Erkennung einfacher Fehleingaben.
    Integration & Testing: Code zusammenführen und die Anwendung systematisch anhand der Testfälle überprüfen.
    Team-Code-Review: Durchsprache im Team sicherstellen, damit alle Mitglieder den Code und die Logik erklären können.
    Zusatzfunktionen (optional): Erst nach vollständiger Funktion der Pflichtanforderungen Zusatzfeatures wie Wochenübersicht, Überstundenberechnung oder Speicherung ergänzen.

4.  Einführung & Demonstration
    Ziel: Präsentation für den Auftraggeber durchführen.

    Präsentationsstruktur (5 Kriterien):
    Ergebnis: Funktionsfähige Anwendung live vorführen.
    Anforderungen: Umgesetzte Pflichtanforderungen nachweisen.
    Test: Vorgehensweise bei der Überprüfung der korrekten Funktion erklären.

    Vorgehen: Organisation der Teamarbeit aufzeigen.

    Reflexion: Ansätze für zukünftige Verbesserungen und Weiterentwicklungen nennen.
