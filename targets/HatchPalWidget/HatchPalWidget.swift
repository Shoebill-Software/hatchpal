import SwiftUI
import WidgetKit

struct HatchPalWidget: Widget {
    let kind: String = "HatchPalWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: HatchPalTimelineProvider()) { entry in
            HatchPalWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Nest")
        .description("Incubation progress, warmth, and humidity for the egg in focus.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct HatchPalWidgetBundle: WidgetBundle {
    var body: some Widget {
        HatchPalWidget()
    }
}
