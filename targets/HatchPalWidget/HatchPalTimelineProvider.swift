import Foundation
import WidgetKit

struct WidgetShell: Codable, Equatable {
    let shape: String
    let speckle: String
    let body: String
    let stroke: String
    let highlight: String
    let speckleColor: String
    let shadow: String
    let crack: String

    static let fallback = WidgetShell(
        shape: "oval",
        speckle: "fine",
        body: "#F3E4B8",
        stroke: "#D7C28A",
        highlight: "#FFF8E6",
        speckleColor: "#C4A66A",
        shadow: "#3A2A1C",
        crack: "#5C4030"
    )
}

struct WidgetFrame: Codable, Equatable {
    let atEpoch: Int
    let phase: String
    let headline: String
    let detail: String
    let footer: String?
    let progressPct: Double
    let temperatureText: String
    let warmthLabel: String
    let warmthOptimal: Bool
    let humidityText: String
    let humidityLabel: String
    let humidityOptimal: Bool
    let inSweetSpot: Bool
    let onStrike: Bool
    let pipped: Bool
    let accessibilityLabel: String

    var progress: Double {
        min(1, max(0, progressPct))
    }
}

struct WidgetPayload: Codable, Equatable {
    let phase: String
    let petId: String
    let speciesId: String
    let nickname: String
    let commonName: String
    let clutchLabel: String?
    let hearts: Int
    let shell: WidgetShell
    let warmthTitle: String
    let humidityTitle: String
    let emptyTitle: String
    let emptyBody: String
    let unviableTitle: String
    let unviableBody: String
    let hatchedDetail: String
    let frames: [WidgetFrame]

    static let placeholder = WidgetPayload(
        phase: "incubating",
        petId: "preview",
        speciesId: "silkie_chicken",
        nickname: "Pip",
        commonName: "Silkie Chicken",
        clutchLabel: nil,
        hearts: 0,
        shell: .fallback,
        warmthTitle: "Warmth",
        humidityTitle: "Humidity",
        emptyTitle: "The Cradle is Waiting",
        emptyBody: "Choose an egg to nurture.",
        unviableTitle: "The nest has gone cold",
        unviableBody: "The embryo did not survive the prolonged climate drop.",
        hatchedDetail: "Place in the Sanctuary",
        frames: [
            WidgetFrame(
                atEpoch: 0,
                phase: "incubating",
                headline: "Day 8 of 21",
                detail: "Mild day · Steady drift",
                footer: "Sing to me · 6h",
                progressPct: 8.0 / 21.0,
                temperatureText: "37.5°",
                warmthLabel: "Optimal",
                warmthOptimal: true,
                humidityText: "55%",
                humidityLabel: "Optimal",
                humidityOptimal: true,
                inSweetSpot: true,
                onStrike: false,
                pipped: false,
                accessibilityLabel: "Pip, Silkie Chicken, Day 8 of 21, Mild day, steady drift, warmth 37.5 degrees optimal, humidity 55 percent optimal"
            ),
        ]
    )
}

enum WidgetPayloadStore {
    static let suiteName = "group.com.shoebillsoftware.hatchpal"
    static let key = "hatchpal.widget.payload"

    static func load() -> WidgetPayload? {
        guard let defaults = UserDefaults(suiteName: suiteName) else {
            return nil
        }
        if let raw = defaults.string(forKey: key), let data = raw.data(using: .utf8) {
            return decode(data)
        }
        if let data = defaults.data(forKey: key) {
            return decode(data)
        }
        return nil
    }

    private static func decode(_ data: Data?) -> WidgetPayload? {
        guard let data, !data.isEmpty else {
            return nil
        }
        if let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data) {
            if payload.phase == "empty" || !payload.frames.isEmpty {
                return payload
            }
        }
        return legacy(data)
    }

    /// Payloads written before weather, wishes, and shell art shipped.
    private static func legacy(_ data: Data) -> WidgetPayload? {
        guard
            let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let petId = object["petId"] as? String,
            !petId.isEmpty,
            let nickname = object["nickname"] as? String,
            let day = object["incubationDayDisplay"] as? String
        else {
            return nil
        }
        let speciesId = object["speciesId"] as? String ?? ""
        let warmthOptimal = (object["temperatureStatus"] as? String) == "optimal"
        let humidityOptimal = (object["humidityStatus"] as? String) == "optimal"
        let ready = object["isReadyToHatch"] as? Bool ?? false
        let progress = object["progressPct"] as? Double ?? 0
        let temperature = object["temperatureCelsius"] as? Double ?? 0
        let humidity = object["humidityPct"] as? Double ?? 0
        let epoch = object["lastUpdatedEpoch"] as? Int ?? 0
        let headline = ready ? "Ready to hatch" : day
        let frame = WidgetFrame(
            atEpoch: epoch,
            phase: ready ? "ready" : "incubating",
            headline: headline,
            detail: "Mild day · Steady drift",
            footer: nil,
            progressPct: progress,
            temperatureText: String(format: "%.1f°", temperature),
            warmthLabel: warmthOptimal ? "Optimal" : "Too Cold",
            warmthOptimal: warmthOptimal,
            humidityText: String(format: "%.0f%%", humidity),
            humidityLabel: humidityOptimal ? "Optimal" : "Dry",
            humidityOptimal: humidityOptimal,
            inSweetSpot: warmthOptimal && humidityOptimal,
            onStrike: false,
            pipped: false,
            accessibilityLabel: "\(nickname), \(headline)"
        )
        return WidgetPayload(
            phase: frame.phase,
            petId: petId,
            speciesId: speciesId,
            nickname: nickname,
            commonName: WidgetSpeciesNames.commonName(for: speciesId),
            clutchLabel: nil,
            hearts: 0,
            shell: .fallback,
            warmthTitle: "Warmth",
            humidityTitle: "Humidity",
            emptyTitle: "The Cradle is Waiting",
            emptyBody: "Choose an egg to nurture.",
            unviableTitle: "The nest has gone cold",
            unviableBody: "The embryo did not survive the prolonged climate drop.",
            hatchedDetail: "Place in the Sanctuary",
            frames: [frame]
        )
    }
}

enum WidgetSpeciesNames {
    private static let names: [String: String] = [
        "silkie_chicken": "Silkie Chicken",
        "peregrine_falcon": "Peregrine Falcon",
        "barn_owl": "Barn Owl",
        "mandarin_duck": "Mandarin Duck",
        "american_robin": "American Robin",
        "emperor_penguin": "Emperor Penguin",
        "common_ostrich": "Common Ostrich",
        "emu": "Emu",
        "leopard_gecko": "Leopard Gecko",
        "veiled_chameleon": "Veiled Chameleon",
        "ball_python": "Ball Python",
        "green_sea_turtle": "Green Sea Turtle",
        "saltwater_crocodile": "Saltwater Crocodile",
        "platypus": "Platypus",
    ]

    static func commonName(for speciesId: String) -> String {
        if let known = names[speciesId] {
            return known
        }
        return speciesId
            .split(separator: "_")
            .map { part in
                guard let first = part.first else { return "" }
                return String(first).uppercased() + part.dropFirst()
            }
            .joined(separator: " ")
    }
}

struct HatchPalEntry: TimelineEntry {
    let date: Date
    let payload: WidgetPayload?
    let frame: WidgetFrame?
}

enum HatchPalTimeline {
    static func entries(for payload: WidgetPayload?, now: Date) -> [HatchPalEntry] {
        guard let payload else {
            return [HatchPalEntry(date: now, payload: nil, frame: nil)]
        }
        if payload.phase == "empty" || payload.frames.isEmpty {
            return [HatchPalEntry(date: now, payload: payload, frame: nil)]
        }
        let nowMs = Int(now.timeIntervalSince1970 * 1000)
        let upcoming = payload.frames.sorted { $0.atEpoch < $1.atEpoch }
        let current = upcoming.last(where: { $0.atEpoch <= nowMs }) ?? upcoming[0]
        var built = [HatchPalEntry(date: now, payload: payload, frame: current)]
        for frame in upcoming where frame.atEpoch > nowMs {
            let date = Date(timeIntervalSince1970: Double(frame.atEpoch) / 1000)
            if let last = built.last?.date, date.timeIntervalSince(last) < 1 {
                continue
            }
            built.append(HatchPalEntry(date: date, payload: payload, frame: frame))
        }
        return built
    }

    static func refresh(after entries: [HatchPalEntry], now: Date) -> Date {
        let last = entries.last?.date ?? now
        return max(last.addingTimeInterval(20 * 60), now.addingTimeInterval(15 * 60))
    }
}

struct HatchPalTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> HatchPalEntry {
        HatchPalTimeline.entries(for: .placeholder, now: Date())[0]
    }

    func getSnapshot(in context: Context, completion: @escaping (HatchPalEntry) -> Void) {
        let stored = WidgetPayloadStore.load()
        let payload = context.isPreview ? (stored ?? .placeholder) : stored
        completion(HatchPalTimeline.entries(for: payload, now: Date())[0])
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<HatchPalEntry>) -> Void) {
        let now = Date()
        let entries = HatchPalTimeline.entries(for: WidgetPayloadStore.load(), now: now)
        completion(Timeline(entries: entries, policy: .after(HatchPalTimeline.refresh(after: entries, now: now))))
    }
}
