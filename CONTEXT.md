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
