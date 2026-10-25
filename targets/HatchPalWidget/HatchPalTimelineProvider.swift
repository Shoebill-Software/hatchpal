import Foundation
import WidgetKit

enum WidgetBand: String, Codable {
    case optimal
    case warning

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let raw = try container.decode(String.self)
        self = raw == WidgetBand.optimal.rawValue ? .optimal : .warning
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(rawValue)
    }
}

struct WidgetPayload: Codable, Equatable {
    let petId: String
    let speciesId: String
    let nickname: String
    let incubationDayDisplay: String
    let progressPct: Double
    let temperatureCelsius: Double
    let temperatureStatus: WidgetBand
    let humidityPct: Double
    let humidityStatus: WidgetBand
    let isReadyToHatch: Bool
    let lastUpdatedEpoch: Int

    var progress: Double {
        min(1, max(0, progressPct))
    }

    var inSweetSpot: Bool {
        temperatureStatus == .optimal && humidityStatus == .optimal
    }

    var warmthLabel: String {
        temperatureStatus == .optimal ? "Optimal" : "Chilled"
    }

    var humidityLabel: String {
        humidityStatus == .optimal ? "Optimal" : "Dry"
    }

    var temperatureText: String {
        String(format: "%.1f°C", temperatureCelsius)
    }

    var humidityText: String {
        String(format: "%.0f%%", humidityPct)
    }

    var speciesCommonName: String {
        WidgetSpeciesNames.commonName(for: speciesId)
    }

    static let placeholder = WidgetPayload(
        petId: "preview",
        speciesId: "silkie_chicken",
        nickname: "Pip",
        incubationDayDisplay: "Day 8 of 21",
        progressPct: 8.0 / 21.0,
        temperatureCelsius: 37.5,
        temperatureStatus: .optimal,
        humidityPct: 55,
        humidityStatus: .optimal,
        isReadyToHatch: false,
        lastUpdatedEpoch: 0
    )
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
        let decoder = JSONDecoder()
        return try? decoder.decode(WidgetPayload.self, from: data)
    }
}

struct HatchPalEntry: TimelineEntry {
    let date: Date
    let payload: WidgetPayload?
}

struct HatchPalTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> HatchPalEntry {
        HatchPalEntry(date: Date(), payload: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (HatchPalEntry) -> Void) {
        let stored = WidgetPayloadStore.load()
        let payload = context.isPreview ? (stored ?? .placeholder) : stored
        completion(HatchPalEntry(date: Date(), payload: payload))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<HatchPalEntry>) -> Void) {
        let payload = WidgetPayloadStore.load()
        let now = Date()
        let refresh = now.addingTimeInterval(45 * 60)
        let entries = [
            HatchPalEntry(date: now, payload: payload),
            HatchPalEntry(date: refresh, payload: payload),
        ]
        completion(Timeline(entries: entries, policy: .after(refresh)))
    }
}
