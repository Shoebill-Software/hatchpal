# 🥚 HatchPal

**Authentische biologische Echtzeit-Brut- und Aufzuchtsimulation für mobile Endgeräte.**

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2052%2B-000020?logo=expo&logoColor=white)](https://docs.expo.dev/)
[![Offline First](https://img.shields.io/badge/Offline-First-2E7D32)](#kernfeatures)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## Über das Projekt (Vision & Philosophie)

HatchPal ist eine offline-first Simulations-App für iOS und Android. Nutzerinnen und Nutzer adoptieren ein eierlegendes Tier und begleiten dessen kompletten biologischen Brut- und Entwicklungszyklus — in echter biologischer **1:1-Echtzeit**.

Es gibt keine Arcade-Dopaminschleifen, keine beschleunigten Tage und keine künstlichen Hunger-Timer. Ein Seidenhuhn braucht 21 Tage, bis es schlüpft. Ein Leopardgecko braucht 50. Eine Grüne Meeresschildkröte braucht 60. Die App respektiert diese Zeitachsen.

**Zero-Death-Philosophie:** Tiere sterben nicht bei verpassten Sessions. HatchPal bestraft keine Pause — im Vordergrund steht die Faszination für reale Naturprozesse: Embryonalentwicklung, Schlupf, Wachstum. Wer das Ei nicht täglich dreht, verpasst Tiefe, nicht das Leben des Tiers.

---

## Starter-Arten

Das Starter-Trio bildet die biologische Einstiegsmatrix von HatchPal:

| Art | Rolle | Brutzeit | Interner Pip | Externer Pip |
| :--- | :--- | :--- | :--- | :--- |
| **Silkie Chicken / Seidenhuhn** (*Gallus gallus domesticus*) | Zugänglicher Starter | **21 Tage** (504 Stunden) | Tag 19 | Tag 20 |
| **Leopard Gecko** (*Eublepharis macularius*) | Moderater Starter | **50 Tage** (1.200 Stunden) | Tag 47 | Tag 49 |
| **Green Sea Turtle** (*Chelonia mydas*) | Langzeit-Meilenstein | **60 Tage** (1.440 Stunden) | Tag 57 | Tag 59 |

Jede Art bringt eigene Herzfrequenz, Nistpflege und Entwicklungsmeilensteine mit — vom ersten Adernetz bis zum Schlupf.

---

## Kernfeatures

### Egg Candling

Optische Durchleuchtung des Eis mit realistischen embryonalen Entwicklungsstufen: Adernetz, Augenfleck, Luftkammer. Die Darstellung folgt dem biologischen Fortschritt, nicht einem Spiel-Level.

### Taktile Sensorik

Haptisch spürbarer Herzschlag via Haptic Feedback, exakt synchronisiert zur tierartspezifischen BPM-Rate (z. B. 220 BPM beim Seidenhuhn-Ei, 110 BPM beim Leopardgecko, 90 BPM bei der Meeresschildkröte).

### Deterministische Zeit-Engine

Reine mathematische Berechnung über Epochenzeit — absolut kein Akkuverbrauch durch Hintergrunddienste oder aktive Timer. Das Alter des Tiers ergibt sich aus der Differenz zwischen Jetzt und Legezeitpunkt, sobald die App in den Vordergrund kommt.

### Lokale Meilenstein-Benachrichtigungen

Vollständig offline geplante Alerts für biologische Schlüsselmomente (interner Pip, externer Pip, Schlupf). Die Termine werden beim Adoptieren aus der biologischen Matrix berechnet und lokal geplant.

---

## Tech Stack

| Technologie | Rolle |
| :--- | :--- |
| **React Native** | Native UI für iOS und Android |
| **Expo SDK 52+** | Managed Workflow, Tooling, native Module |
| **TypeScript** | Strikte Typisierung (`noImplicitAny`, `strictNullChecks`) |
| **Zustand** | Client-State mit persistenter Speicherung |
| **MMKV** (`react-native-mmkv`) | Schneller lokaler Speicher, offline-first |
| **Expo Haptics** | Taktile Herzschlag-Rückmeldung |
| **Expo Audio** | Nest-Ambiente und Schlupf-Sounds |
| **Expo Notifications** | Lokale, offline geplante Meilenstein-Alerts |
| **Rive / Skia** | Charakter- und Ei-Animationen sowie Candling-Shader |

Die gesamte Spiellogik läuft ohne Netz. Zeitsubtraktionen finden ausschließlich auf dem Gerät statt.

---

## Projektstruktur

```text
hatchpal/
├── src/
│   ├── app/                 # Expo Router (file-based routing)
│   ├── components/          # Wiederverwendbare UI (Candling, Nest, Metriken)
│   ├── data/
│   │   └── species/         # Artprofile: Seidenhuhn, Gecko, Schildkröte
│   ├── domain/              # Reine Simulationsmathematik (ohne React)
│   │   └── __tests__/       # Deterministische Unit-Tests der Zeit-Engine
│   ├── hooks/               # Brücken zwischen Domain, Store und UI
│   ├── screens/             # Adoption, Nest, Candling
│   ├── store/               # Zustand + MMKV-Persistenz
│   └── utils/               # Formatierung und Pflege-Hilfen
├── assets/                  # Icons, Splash, Animationen
├── app.json
├── package.json
└── tsconfig.json
```

`src/domain` bleibt frei von React-Abhängigkeiten: Fortschritt, Meilensteine und Integrität sind reine Funktionen über Zeitstempel.

---

## Erste Schritte & Entwicklung

Voraussetzungen: Node.js (LTS) und das [Expo](https://docs.expo.dev/)-Ökosystem.

### Installation

```bash
npm install
```

### Entwicklungsserver starten

```bash
npm start
```

Alternativ:

```bash
npx expo start
```

Anschließend Expo Go, einen Simulator oder einen Development Build wählen.

### Unit-Tests

```bash
npm test
```

### Statische Typprüfung

```bash
npx tsc --noEmit
```

---

## Lizenz

HatchPal steht unter der [MIT License](./LICENSE).
