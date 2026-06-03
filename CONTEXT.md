# LLMAO — Domain Glossary

## Spiel (Game)

Eine Partie Cards Against LLMs. Durchläuft sechs Status in fester Reihenfolge.

### Status-Werte

| Status | Bedeutung |
|---|---|
| `created` | Erstellt, Konfiguration möglich |
| `prompting` | Prompt (schwarze Karte) wird von LLM generiert |
| `responding` | Antworten (weiße Karten) werden von Spielern/LLMs generiert |
| `voting` | Abstimmung läuft |
| `resolved` | Ergebnis festgestellt, ELO berechnet |
| `locked` | Finaler Zustand, keine Änderungen mehr |

### Lebenszyklus

Erstellt (`created`) → Prompt-Erzeugung (`prompting`) → Antwort-Phase (`responding`) → Abstimmung (`voting`) → Ergebnis (`resolved`) → Abgeschlossen (`locked`)

### Spiel-Phasen (gruppiert)

| Phase | Status | Beschreibung |
|---|---|---|
| **Laufendes Spiel** | `created`, `prompting`, `responding`, `voting` | Noch nicht abgeschlossen |
| **Vergangenes Spiel** | `resolved`, `locked` | Abgeschlossen |

## Prompt (Schwarze Karte)

Die von einem LLM generierte Frage/Aufforderung, zu der Spieler Antworten einreichen.

## Answer (Weiße Karte)

Eine von einem Spieler oder LLM eingereichte Antwort auf den Prompt.

## Vote (Stimme)

Eine Abstimmung eines Voters (Modell oder Mensch) für eine bestimmte Antwort.

## Rating (ELO)

Elo-Wertung pro Modell, aktualisiert nach Spielende via Multi-Player-Elo.

## Spiel-Lebenszyklus (Game State Machine)

Die interne Implementierung des Spiel-Lebenszyklus. Ein tiefer Modul (`convex/state_machine.ts`), der alle Status-Übergänge, Seiteneffekte (Scheduling von LLM-Aufrufen) und automatischen Weiterschaltlogik kapselt. Die öffentlichen Mutationen in `convex/games.ts` sind dünne Adapter, die an dieses Modul delegieren.

### Kern-Interface

- `handleStart(ctx, gameId)` — Startet das Spiel, wechselt von `created` → `prompting`, scheduled Prompt-Generierung
- `handlePromptResult` / `handlePromptFailure` — Ergebnis/Fehler der Prompt-Generierung verarbeiten
- `handleAnswerResult` / `handleAnswerFailure` — Ergebnis/Fehler einer KI-Antwort verarbeiten
- `handleVoteResult` / `handleVoteFailure` — Ergebnis/Fehler einer KI-Abstimmung verarbeiten
- `handleUserAnswer` / `handleUserVote` — Menschliche Antwort/Abstimmung verarbeiten
- `handleAdvanceToVoting` / `handleAutoAdvanceToVoting` — Manueller/Timer-gesteuerter Wechsel zu Abstimmung
- `handleFinalize` / `handleAutoFinalize` — Finalisierung des Spiels, ELO-Berechnung

### Vorteile

- *Leverage*: Ein Interface ersetzt 6 wiederholte "get game → check status" Patterns
- *Locality*: Alle Übergangslogik an einem Ort; Änderungen konzentrieren sich in einer Datei
- *Testbar*: Die Naht des Moduls ist die Testoberfläche; 61 Zeilen Duplikat entfernt
