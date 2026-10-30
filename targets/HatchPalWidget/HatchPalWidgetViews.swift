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
    static let strike = Color(red: 224.0 / 255.0, green: 122.0 / 255.0, blue: 106.0 / 255.0)
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

struct BeaconDot: View {
    let sweet: Bool
    let strike: Bool

    private var color: Color {
        if strike {
            return NestInk.strike
        }
        return sweet ? NestInk.optimal : NestInk.warning
    }

    var body: some View {
        Circle()
            .fill(color)
            .frame(width: 8, height: 8)
            .background(Circle().fill(color.opacity(0.28)).frame(width: 14, height: 14))
            .accessibilityHidden(true)
    }
}

struct SmallNestWidget: View {
    let payload: WidgetPayload?
    let frame: WidgetFrame?

    var body: some View {
        if let payload, let frame, payload.phase != "empty" {
            living(payload: payload, frame: frame)
        } else {
            EmptyNestWidget(compact: true, payload: payload)
        }
    }

    @ViewBuilder
    private func living(payload: WidgetPayload, frame: WidgetFrame) -> some View {
        let somber = frame.phase == "unviable"
        let headlineColor: Color = frame.phase == "ready" ? NestInk.progress : (somber ? NestInk.muted : NestInk.text)
        VStack(spacing: 4) {
            ZStack(alignment: .topTrailing) {
                SpeciesEggMark(
                    shell: payload.shell,
                    progress: frame.progressPct,
                    pipped: frame.pipped,
                    dimmed: somber
                )
                if frame.phase == "incubating" || frame.phase == "ready" {
                    BeaconDot(sweet: frame.inSweetSpot, strike: frame.onStrike)
                        .padding(1)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            Text(payload.nickname)
                .font(.caption.weight(.semibold))
                .foregroundStyle(NestInk.text)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .layoutPriority(1)
            Text(frame.headline)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(headlineColor)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .layoutPriority(1)
            if let footer = frame.footer, frame.phase != "unviable" {
                Text(footer)
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(frame.onStrike ? NestInk.strike : NestInk.muted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.65)
                    .layoutPriority(1)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(frame.accessibilityLabel)
    }
}

struct MediumNestWidget: View {
    let payload: WidgetPayload?
    let frame: WidgetFrame?

    var body: some View {
        if let payload, let frame, payload.phase != "empty" {
            switch frame.phase {
            case "unviable":
                StatusNestWidget(
                    payload: payload,
                    frame: frame,
                    title: payload.unviableTitle,
                    message: payload.unviableBody,
                    dimmed: true
                )
            case "hatched":
                StatusNestWidget(
                    payload: payload,
                    frame: frame,
                    title: frame.headline,
                    message: payload.hatchedDetail,
                    dimmed: false
                )
            default:
                living(payload: payload, frame: frame)
            }
        } else {
            EmptyNestWidget(compact: false, payload: payload)
        }
    }

    private func living(payload: WidgetPayload, frame: WidgetFrame) -> some View {
        return HStack(alignment: .center, spacing: 10) {
            ViewThatFits(in: .vertical) {
                if frame.footer != nil {
                    identityColumn(payload: payload, frame: frame, egg: 52, showsWeather: true, showsFooter: true)
                }
                identityColumn(payload: payload, frame: frame, egg: 64, showsWeather: true, showsFooter: false)
                identityColumn(payload: payload, frame: frame, egg: 72, showsWeather: false, showsFooter: false)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            VStack(spacing: 6) {
                TelemetryCard(
                    title: payload.warmthTitle,
                    value: frame.temperatureText,
                    tag: frame.warmthLabel,
                    optimal: frame.warmthOptimal,
                    strike: frame.onStrike && !frame.warmthOptimal
                )
                TelemetryCard(
                    title: payload.humidityTitle,
                    value: frame.humidityText,
                    tag: frame.humidityLabel,
                    optimal: frame.humidityOptimal,
                    strike: frame.onStrike && !frame.humidityOptimal
                )
            }
            .frame(maxWidth: .infinity)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(frame.accessibilityLabel)
    }

    private func identityColumn(
        payload: WidgetPayload,
        frame: WidgetFrame,
        egg: CGFloat,
        showsWeather: Bool,
        showsFooter: Bool
    ) -> some View {
        let headlineColor: Color = frame.phase == "ready" ? NestInk.progress : NestInk.text
        return VStack(spacing: 2) {
            ZStack(alignment: .topTrailing) {
                SpeciesEggMark(
                    shell: payload.shell,
                    progress: frame.progressPct,
                    pipped: frame.pipped,
                    dimmed: false
                )
                BeaconDot(sweet: frame.inSweetSpot, strike: frame.onStrike)
            }
            .frame(width: egg, height: egg)
            Text(payload.nickname)
                .font(.caption.weight(.semibold))
                .foregroundStyle(NestInk.text)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(frame.headline)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(headlineColor)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            if showsWeather {
                Text(frame.detail)
                    .font(.caption2)
                    .foregroundStyle(NestInk.muted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.65)
            }
            if showsFooter, let footer = frame.footer {
                Text(footer)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(frame.onStrike ? NestInk.strike : NestInk.progress)
                    .lineLimit(1)
                    .minimumScaleFactor(0.65)
            }
        }
    }
}

private struct StatusNestWidget: View {
    let payload: WidgetPayload
    let frame: WidgetFrame
    let title: String
    let message: String
    let dimmed: Bool

    var body: some View {
        HStack(spacing: 12) {
            SpeciesEggMark(
                shell: payload.shell,
                progress: dimmed ? frame.progressPct : 1,
                pipped: frame.pipped && !dimmed,
                dimmed: dimmed
            )
            .frame(width: 78, height: 78)
            VStack(alignment: .leading, spacing: 4) {
                Text(payload.nickname)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(NestInk.muted)
                    .lineLimit(1)
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(NestInk.text)
                    .lineLimit(2)
                    .minimumScaleFactor(0.75)
                Text(message)
                    .font(.caption2)
                    .foregroundStyle(NestInk.muted)
                    .lineLimit(3)
                    .minimumScaleFactor(0.8)
                if let footer = frame.footer {
                    Text(footer)
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(NestInk.progress)
                        .lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(frame.accessibilityLabel)
    }
}

private struct TelemetryCard: View {
    let title: String
    let value: String
    let tag: String
    let optimal: Bool
    let strike: Bool

    private var tagColor: Color {
        if strike {
            return NestInk.strike
        }
        return optimal ? NestInk.optimal : NestInk.warning
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
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
                .foregroundStyle(tagColor)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(NestInk.card, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private struct EmptyNestWidget: View {
    let compact: Bool
    let payload: WidgetPayload?

    private var title: String {
        payload?.emptyTitle ?? "The nest is empty"
    }

    private var detail: String {
        payload?.emptyBody ?? "Choose an egg in HatchPal"
    }

    var body: some View {
        VStack(spacing: 8) {
            EggArtwork(shell: WidgetShell.fallback, pipped: false)
                .frame(width: compact ? 46 : 58, height: compact ? 62 : 78)
                .opacity(0.35)
            Text(title)
                .font(compact ? .caption.weight(.semibold) : .subheadline.weight(.semibold))
                .foregroundStyle(NestInk.text)
                .multilineTextAlignment(.center)
            if !compact {
                Text(detail)
                    .font(.caption2)
                    .foregroundStyle(NestInk.muted)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(title). \(detail)")
    }
}

struct HatchPalWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: HatchPalEntry

    var body: some View {
        Group {
            switch family {
            case .systemMedium:
                MediumNestWidget(payload: entry.payload, frame: entry.frame)
            default:
                SmallNestWidget(payload: entry.payload, frame: entry.frame)
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
