# HatchPal — Project Specification

## 1. Executive Summary

HatchPal is an offline-first iOS and Android simulation app built with Expo SDK 52+, TypeScript, Rive, and React Native Skia. HatchPal allows users to adopt an oviparous (egg-laying) animal and experience its complete biological incubation and development lifecycle in genuine 1:1 real time.

The app discards punitive mechanics (pets never die from missed sessions) in favor of authentic biology, deterministic timestamp-based simulation, egg candling optics, and sensory tactile feedback.

---

## 2. Directory Architecture

```text
hatchpal/
├── .cursor/
│   └── rules/
│       ├── tech-stack.mdc           # Architecture constraints and dependency rules
│       ├── simulation-engine.mdc    # Determinism rules and time calculation specs
│       └── ui-animation.mdc         # Rive, Skia shaders, and sensory interaction rules
├── assets/
│   ├── animations/                  # .riv Rive vector binaries
│   ├── audio/                       # Minimal high-fidelity WAV/MP3 sound effects
│   └── icons/                       # App and milestone badge icons
├── src/
│   ├── components/                  # Reusable presentation components
│   │   ├── CandlingView.tsx         # Skia-powered light penetration & embryo overlay
│   │   ├── EggContainer.tsx         # Nest container with gesture tilt/turn mechanics
│   │   ├── MetricCard.tsx           # Temperature, humidity, and age readouts
│   │   └── SensoryHeartbeat.tsx     # Audio/haptic synchronization manager
│   ├── data/
│   │   └── species/
│   │       ├── index.ts             # Registry mapping species IDs to configs
│   │       ├── chicken.ts           # Gallus gallus domesticus profile
│   │       ├── gecko.ts             # Eublepharis macularius profile
│   │       └── turtle.ts            # Chelonia mydas profile
│   ├── domain/                      # Pure mathematical engines (zero React dependencies)
│   │   ├── __tests__/               # Jest test suites for deterministic growth math
│   │   ├── milestones.ts            # Milestone resolution and query utilities
│   │   ├── timeEngine.ts            # Epoch delta conversions and progress formulas
│   │   └── types.ts                 # Core entities, schemas, and species contracts
│   ├── hooks/                       # Reactive bridges into domain engines
│   │   ├── useActivePet.ts          # State subscription with auto-refresh on foreground
│   │   ├── useCandlingTouch.ts      # Gesture coordinate tracking for Skia canvas
│   │   └── useHapticHeartbeat.ts    # Interval timer for species-specific BPM haptics
│   ├── navigation/                  # Root and tab routing definitions
│   │   └── RootNavigator.tsx
│   ├── screens/                     # Top-level application views
│   │   ├── AdoptionScreen.tsx       # Species selection carousel and initial naming
│   │   ├── CandlingScreen.tsx       # Transillumination inspection screen
│   │   ├── JournalScreen.tsx        # Milestone history and biological field log
│   │   └── NestScreen.tsx           # Primary home dashboard with current egg/nest state
│   ├── store/                       # State persistence layer
│   │   ├── storage.ts               # MMKV wrapper conforming to StateStorage interface
│   │   └── usePetStore.ts           # Primary Zustand store with sync MMKV persistence
│   └── utils/                       # Date formatters and notification helpers
│       └── notifications.ts         # Expo local notification scheduler for milestones
├── app.json
├── package.json
└── tsconfig.json
```

---

## 3. Initial Species Biological Matrix

| Parameter | Gallus gallus domesticus (Silkie Chicken) | Eublepharis macularius (Leopard Gecko) | Chelonia mydas (Green Sea Turtle) |
| :--- | :--- | :--- | :--- |
| **Role** | Accessible Starter | Moderate Starter | Long-Haul Milestone Pet |
| **Incubation Window** | 21 Days (504 Hours) | 50 Days (1,200 Hours) | 60 Days (1,440 Hours) |
| **Internal Pip** | Day 19 | Day 47 | Day 57 |
| **External Pip** | Day 20 | Day 49 | Day 59 |
| **Adulthood Span** | 126 Days (~18 Weeks) | 330 Days (~11 Months) | 730 Days (Compressed ~2 Years) |
| **Egg Base Heart Rate** | 220 BPM | 110 BPM | 90 BPM |
| **Required Nest Care** | Turning 3x daily (Days 1–18) | Constant 31°C substrate | High moisture preservation |

---

## 4. Biological Milestone Definitions (Silkie Chicken)

* **Day 0 (0% - Hour 0)**: Freshly laid egg. Blastoderm visible only as a faint disk during candling.
* **Day 3 (14.28% - Hour 72)**: Cleavage & initial vascular system. Vitelline circulation forms circular blood islands.
* **Day 8 (38.09% - Hour 192)**: Organogenesis phase. Chorioallantoic membrane lines shell surface. Eye spot plainly visible as a distinct dark locus.
* **Day 14 (66.66% - Hour 336)**: Embryo silhouette occupies over half the egg cavity. Spontaneous limb movement detectable under bright light.
* **Day 19 (90.47% - Hour 456)**: Internal pip. Beak penetrates into the air cell. Embryonic lungs begin gas exchange; faint chirping and bill-clicking audible. Heart rate stabilizes down toward 200 BPM.
* **Day 20 (95.23% - Hour 480)**: External pip. Shell star-crack appears. Active turning is discontinued.
* **Day 21 (100.0% - Hour 504)**: Hatch complete. Wet chick emerges, transitions to heat-brooder nest view.

---

## 5. Core Systems Architecture

### A. Deterministic Time Engine

* **No Active Timers**: The app does not consume battery life calculating seconds in the background. Pet age is computed upon demand using:
  $$\text{elapsedSeconds} = \max\left(0, \frac{T_{\text{current}} - T_{\text{laid}}}{1000}\right)$$
  $$\text{incubationProgress} = \min\left(1.0, \frac{\text{elapsedSeconds}}{\text{totalIncubationDays} \times 86400}\right)$$

* **Clock Rollback Guard**: If $T_{\text{current}} < T_{\text{lastVerified}}$, freeze progress calculations at $T_{\text{lastVerified}}$ until $T_{\text{current}} \ge T_{\text{lastVerified}}$.

### B. Candling Shader Pipeline

* Virtual light is positioned using gesture pointer values on screen or an override slider for device flashlight mode.

* Render pass consists of:
  1. Base egg silhouette mask.
  2. Concentric radial gradient revealing interior translucency.
  3. Milestone-driven vector layer (blood vessels, yolk sac, embryonic mass).
  4. Air cell boundary path at the upper blunt pole.
  5. Shell grain and surface texture occlusion pass.

### C. Offline Milestone Notifications

* When an egg is adopted, HatchPal registers offline local push notifications with `expo-notifications` for all upcoming milestones (Day 3, Day 8, Day 14, Day 19, Day 20, Day 21).

* Notifications require zero internet connectivity and fire punctually according to calculated target epoch values.

---

## 6. Implementation Roadmap

1. **Stage 1: Project Scaffolding**
   * Expo SDK 52+ blank TypeScript template.
   * Strict `tsconfig.json` configurations and path aliases.
   * Install dependencies: `zustand`, `react-native-mmkv`, `expo-haptics`, `expo-crypto`, `expo-notifications`.
2. **Stage 2: Domain Modeling & Silkie Profile**
   * Setup `src/domain/types.ts` defining all milestone, species, and pet interfaces.
   * Assemble `src/data/species/chicken.ts` with complete day-by-day developmental cristeria.
3. **Stage 3: Deterministic Simulation Math**
   * Build `src/domain/timeEngine.ts` to convert timestamps into precise developmental stages.
   * Comprehensive unit test suite (`src/domain/__tests__/timeEngine.test.ts`) covering normal progression, edge-case milestones, and anti-rollback clock checks.
4. **Stage 4: State Store & Persistence**
   * Initialize MMKV storage adapter conforming to Zustand `persist`.
   * Setup `usePetStore` with egg adoption, interaction, and state refresh actions.
5. **Stage 5: UI, Candling & Sensory Integration**
   * Implement `NestScreen` with egg inspection and status readouts.
   * Implement `CandlingScreen` with Skia shaders and synchronized heartbeat haptics.
6. **Stage 6: Milestone Scheduling & Audio**
   * Implement automated offline notification triggers upon egg creation.
   * Add ambient nest audio and hatching sound effects.
