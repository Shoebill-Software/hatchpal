import SwiftUI
import WidgetKit

enum NestInk {
    static let canvas = Color(red: 14.0 / 255.0, green: 14.0 / 255.0, blue: 16.0 / 255.0)
    static let card = Color(red: 36.0 / 255.0, green: 30.0 / 255.0, blue: 25.0 / 255.0)
    static let shell = Color(red: 243.0 / 255.0, green: 228.0 / 255.0, blue: 184.0 / 255.0)
    static let shellStroke = Color(red: 215.0 / 255.0, green: 194.0 / 255.0, blue: 138.0 / 255.0)
    static let text = Color(red: 244.0 / 255.0, green: 237.0 / 255.0, blue: 227.0 / 255.0)
    static let muted = Color(red: 180.0 / 255.0, green: 168.0 / 255.0, blue: 156.0 / 255.0)
    static let progress = Color(red: 208.0 / 255.0, green: 137.0 / 255.0, blue: 60.0 / 255.0)
    static let track = Color(red: 58.0 / 255.0, green: 50.0 / 255.0, blue: 43.0 / 255.0)
    static let optimal = Color(red: 91.0 / 255.0, green: 191.0 / 255.0, blue: 122.0 / 255.0)
    static let warning = Color(red: 224.0 / 255.0, green: 161.0 / 255.0, blue: 90.0 / 255.0)
}

struct EggSilhouette: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let w = rect.width
        let h = rect.height
        let top = CGPoint(x: rect.minX + w * 0.50, y: rect.minY + h * 0.03)
        let bottom = CGPoint(x: rect.minX + w * 0.50, y: rect.minY + h * 0.97)
        path.move(to: top)
        path.addCurve(
            to: bottom,
            control1: CGPoint(x: rect.minX + w * 1.02, y: rect.minY + h * 0.24),
            control2: CGPoint(x: rect.minX + w * 0.94, y: rect.minY + h * 0.70)
        )
        path.addCurve(
            to: top,
            control1: CGPoint(x: rect.minX + w * 0.06, y: rect.minY + h * 0.70),
            control2: CGPoint(x: rect.minX - w * 0.02, y: rect.minY + h * 0.24)
        )
        path.closeSubpath()
        return path
    }
}

private struct NestCanvasBackground: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 17.0, *) {
            content.containerBackground(NestInk.canvas, for: .widget)
        } else {
            content.background(NestInk.canvas)
        }
    }
}

struct EggProgressMark: View {
    let progress: Double

    var body: some View {
        ZStack {
            Circle()
                .stroke(NestInk.track, lineWidth: 4)
            Circle()
                .trim(from: 0, to: CGFloat(min(max(progress, 0), 1)))
                .stroke(NestInk.progress, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .rotationEffect(.degrees(-90))
            EggSilhouette()
                .fill(NestInk.shell)
                .overlay(EggSilhouette().stroke(NestInk.shellStroke, lineWidth: 1))
                .padding(11)
        }
        .aspectRatio(1, contentMode: .fit)
    }
}

struct BeaconDot: View {
    let sweet: Bool

    var body: some View {
        Circle()
            .fill(sweet ? NestInk.optimal : NestInk.warning)
            .frame(width: 8, height: 8)
            .accessibilityLabel(sweet ? "Temperature and humidity optimal" : "Nest climate needs care")
    }
}

struct SmallNestWidget: View {
    let payload: WidgetPayload?

    var body: some View {
        if let payload {
            VStack(spacing: 6) {
                ZStack(alignment: .topTrailing) {
                    EggProgressMark(progress: payload.progress)
                    BeaconDot(sweet: payload.inSweetSpot)
                        .padding(2)
                }
                Text(payload.nickname)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(NestInk.text)
                    .lineLimit(1)
                Text(payload.incubationDayDisplay)
                    .font(.caption2)
                    .foregroundStyle(NestInk.muted)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("\(payload.nickname), \(payload.incubationDayDisplay)")
        } else {
            EmptyNestWidget(compact: true)
        }
    }
}

struct MediumNestWidget: View {
    let payload: WidgetPayload?

    var body: some View {
        if let payload {
            HStack(alignment: .center, spacing: 12) {
                VStack(spacing: 6) {
                    EggProgressMark(progress: payload.progress)
                        .frame(width: 78, height: 78)
                    Text(payload.speciesCommonName)
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(NestInk.muted)
                        .lineLimit(1)
                    Text(payload.incubationDayDisplay)
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(NestInk.text)
                        .minimumScaleFactor(0.7)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity)

                VStack(spacing: 8) {
                    TelemetryCard(
                        title: "Warmth",
                        value: payload.temperatureText,
                        tag: payload.warmthLabel,
                        optimal: payload.temperatureStatus == .optimal
                    )
                    TelemetryCard(
                        title: "Humidity",
                        value: payload.humidityText,
                        tag: payload.humidityLabel,
                        optimal: payload.humidityStatus == .optimal
                    )
                }
                .frame(maxWidth: .infinity)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(
                "\(payload.nickname), \(payload.speciesCommonName), \(payload.incubationDayDisplay), warmth \(payload.temperatureText) \(payload.warmthLabel), humidity \(payload.humidityText) \(payload.humidityLabel)"
            )
        } else {
            EmptyNestWidget(compact: false)
        }
    }
}

private struct TelemetryCard: View {
    let title: String
    let value: String
    let tag: String
    let optimal: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.caption2.weight(.medium))
                .foregroundStyle(NestInk.muted)
            Text(value)
                .font(.headline.weight(.semibold))
                .foregroundStyle(NestInk.text)
                .minimumScaleFactor(0.7)
                .lineLimit(1)
            Text(tag)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(optimal ? NestInk.optimal : NestInk.warning)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(NestInk.card, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private struct EmptyNestWidget: View {
    let compact: Bool

    var body: some View {
        VStack(spacing: 8) {
            EggSilhouette()
                .stroke(NestInk.track, style: StrokeStyle(lineWidth: 1.5, dash: [3, 3]))
                .frame(width: compact ? 52 : 64, height: compact ? 68 : 82)
            Text("The nest is empty")
                .font(compact ? .caption.weight(.semibold) : .subheadline.weight(.semibold))
                .foregroundStyle(NestInk.text)
                .multilineTextAlignment(.center)
            if !compact {
                Text("Choose an egg in HatchPal")
                    .font(.caption2)
                    .foregroundStyle(NestInk.muted)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("The nest is empty. Choose an egg in HatchPal.")
    }
}

struct HatchPalWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: HatchPalEntry

    var body: some View {
        Group {
            switch family {
            case .systemMedium:
                MediumNestWidget(payload: entry.payload)
            default:
                SmallNestWidget(payload: entry.payload)
            }
        }
        .widgetURL(cradleURL)
        .modifier(NestCanvasBackground())
    }

    private var cradleURL: URL? {
        guard let petId = entry.payload?.petId, !petId.isEmpty, petId != "preview" else {
            return URL(string: "hatchpal://")
        }
        let encoded = petId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? petId
        return URL(string: "hatchpal://cradle/\(encoded)")
    }
}
