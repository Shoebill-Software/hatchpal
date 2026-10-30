import SwiftUI

/// Species egg, drawn from the same paths as `SpeciesEggArt` in the nest.
struct SpeciesEggMark: View {
    let shell: WidgetShell
    let progress: Double
    let pipped: Bool
    let dimmed: Bool

    var body: some View {
        GeometryReader { geo in
            let side = min(geo.size.width, geo.size.height)
            ZStack {
                Circle()
                    .stroke(NestInk.track, lineWidth: max(3, side * 0.045))
                Circle()
                    .trim(from: 0, to: CGFloat(min(max(progress, 0), 1)))
                    .stroke(
                        NestInk.progress,
                        style: StrokeStyle(lineWidth: max(3, side * 0.045), lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                EggArtwork(shell: shell, pipped: pipped)
                    .aspectRatio(120.0 / 160.0, contentMode: .fit)
                    .padding(side * 0.16)
                    .opacity(dimmed ? 0.42 : 1)
                    .saturation(dimmed ? 0.2 : 1)
            }
            .frame(width: side, height: side)
            .position(x: geo.size.width / 2, y: geo.size.height / 2)
        }
        .aspectRatio(1, contentMode: .fit)
    }
}

struct EggArtwork: View {
    let shell: WidgetShell
    let pipped: Bool

    var body: some View {
        Canvas { context, size in
            let rect = CGRect(origin: .zero, size: size)
            let body = Color.nestHex(shell.body, fallback: NestInk.shell)
            let stroke = Color.nestHex(shell.stroke, fallback: NestInk.shellStroke)
            let highlight = Color.nestHex(shell.highlight, fallback: NestInk.text)
            let speckle = Color.nestHex(shell.speckleColor, fallback: NestInk.shellStroke)
            let shadow = Color.nestHex(shell.shadow, fallback: NestInk.track)
            let crack = Color.nestHex(shell.crack, fallback: NestInk.strike)

            context.fill(
                EggGeometry.ellipse(cx: 60, cy: 150, rx: 34, ry: 6, in: rect),
                with: .color(shadow.opacity(0.28))
            )

            let egg = EggGeometry.path(EggArt.shape(shell.shape), in: rect)
            context.fill(egg, with: .color(body))

            var shine = context
            shine.clip(to: egg)
            shine.stroke(
                EggGeometry.path(EggArt.highlight, in: rect),
                with: .color(highlight.opacity(0.55)),
                style: StrokeStyle(lineWidth: max(1.5, size.width / 120 * 6), lineCap: .round)
            )

            let marks = EggArt.speckles(shell.speckle)
            let markOpacity = shell.speckle == "pitted" ? 0.55 : 0.72
            for mark in marks {
                context.fill(
                    EggGeometry.ellipse(cx: mark.cx, cy: mark.cy, rx: mark.rx, ry: mark.ry, in: rect),
                    with: .color(speckle.opacity(markOpacity))
                )
            }

            context.stroke(egg, with: .color(stroke), lineWidth: max(1, size.width / 120 * 1.6))

            if pipped {
                let width = max(1, size.width / 120 * 1.5)
                for crackPath in EggArt.cracks {
                    context.stroke(
                        EggGeometry.path(crackPath, in: rect),
                        with: .color(crack),
                        style: StrokeStyle(lineWidth: width, lineCap: .round)
                    )
                }
            }
        }
    }
}

private struct SpeckleMark {
    let cx: CGFloat
    let cy: CGFloat
    let rx: CGFloat
    let ry: CGFloat
}

private enum EggArt {
    static let highlight = "M46 36 C38 62 38 96 50 122"
    static let cracks = [
        "M74 44 C80 56 70 64 78 76",
        "M82 50 C88 62 78 70 86 82",
    ]

    static func shape(_ name: String) -> String {
        switch name {
        case "elliptical":
            return "M60 20 C32 20 18 54 18 82 C18 112 34 144 60 144 C86 144 102 112 102 82 C102 54 88 20 60 20 Z"
        case "pear":
            return "M60 14 C32 16 18 46 22 78 C26 114 40 150 60 152 C80 150 94 114 98 78 C102 46 88 16 60 14 Z"
        case "sphere":
            return "M60 24 C30 24 16 52 16 82 C16 114 32 142 60 142 C88 142 104 114 104 82 C104 52 90 24 60 24 Z"
        case "elongated":
            return "M60 8 C40 8 26 40 26 82 C26 124 40 154 60 154 C80 154 94 124 94 82 C94 40 80 8 60 8 Z"
        case "pitted":
            return "M60 18 C28 18 12 52 12 84 C12 118 30 148 60 148 C90 148 108 118 108 84 C108 52 92 18 60 18 Z"
        default:
            return "M60 16 C34 16 22 52 22 88 C22 126 38 146 60 146 C82 146 98 126 98 88 C98 52 86 16 60 16 Z"
        }
    }

    static func speckles(_ style: String) -> [SpeckleMark] {
        switch style {
        case "fine":
            return [
                SpeckleMark(cx: 48, cy: 70, rx: 2.2, ry: 1.6),
                SpeckleMark(cx: 74, cy: 88, rx: 1.8, ry: 1.4),
                SpeckleMark(cx: 58, cy: 108, rx: 2, ry: 1.5),
            ]
        case "mottled":
            return [
                SpeckleMark(cx: 44, cy: 62, rx: 8, ry: 5.5),
                SpeckleMark(cx: 70, cy: 78, rx: 6, ry: 4.2),
                SpeckleMark(cx: 50, cy: 96, rx: 7, ry: 4.6),
                SpeckleMark(cx: 76, cy: 112, rx: 5.5, ry: 3.8),
                SpeckleMark(cx: 58, cy: 124, rx: 4, ry: 2.8),
            ]
        case "pitted":
            return [
                SpeckleMark(cx: 40, cy: 58, rx: 2.4, ry: 2.4),
                SpeckleMark(cx: 58, cy: 52, rx: 2, ry: 2),
                SpeckleMark(cx: 76, cy: 64, rx: 2.6, ry: 2.6),
                SpeckleMark(cx: 46, cy: 78, rx: 2.2, ry: 2.2),
                SpeckleMark(cx: 68, cy: 86, rx: 2.4, ry: 2.4),
                SpeckleMark(cx: 84, cy: 96, rx: 2, ry: 2),
                SpeckleMark(cx: 52, cy: 104, rx: 2.6, ry: 2.6),
                SpeckleMark(cx: 74, cy: 116, rx: 2.2, ry: 2.2),
                SpeckleMark(cx: 42, cy: 118, rx: 1.8, ry: 1.8),
            ]
        default:
            return []
        }
    }
}

enum EggGeometry {
    static func path(_ source: String, in rect: CGRect) -> Path {
        let tokens = tokenize(source)
        var path = Path()
        var index = 0

        func number() -> CGFloat? {
            guard index < tokens.count, let value = Double(tokens[index]) else {
                return nil
            }
            index += 1
            return CGFloat(value)
        }

        while index < tokens.count {
            let command = tokens[index]
            index += 1
            switch command {
            case "M":
                if let x = number(), let y = number() {
                    path.move(to: map(x, y, in: rect))
                }
            case "C":
                while index < tokens.count, Double(tokens[index]) != nil {
                    guard
                        let x1 = number(), let y1 = number(),
                        let x2 = number(), let y2 = number(),
                        let x = number(), let y = number()
                    else {
                        break
                    }
                    path.addCurve(
                        to: map(x, y, in: rect),
                        control1: map(x1, y1, in: rect),
                        control2: map(x2, y2, in: rect)
                    )
                }
            case "Z", "z":
                path.closeSubpath()
            default:
                break
            }
        }
        return path
    }

    static func ellipse(cx: CGFloat, cy: CGFloat, rx: CGFloat, ry: CGFloat, in rect: CGRect) -> Path {
        let sx = rect.width / 120
        let sy = rect.height / 160
        return Path(ellipseIn: CGRect(
            x: rect.minX + (cx - rx) * sx,
            y: rect.minY + (cy - ry) * sy,
            width: rx * 2 * sx,
            height: ry * 2 * sy
        ))
    }

    private static func map(_ x: CGFloat, _ y: CGFloat, in rect: CGRect) -> CGPoint {
        CGPoint(
            x: rect.minX + x * rect.width / 120,
            y: rect.minY + y * rect.height / 160
        )
    }

    private static func tokenize(_ source: String) -> [String] {
        var tokens: [String] = []
        var number = ""
        func flush() {
            if !number.isEmpty {
                tokens.append(number)
                number = ""
            }
        }
        for character in source {
            if character.isLetter {
                flush()
                tokens.append(String(character))
            } else if character == "-" && !number.isEmpty {
                flush()
                number = "-"
            } else if character == "." && number.contains(".") {
                flush()
                number = "."
            } else if character.isNumber || character == "." || character == "-" {
                number.append(character)
            } else {
                flush()
            }
        }
        flush()
        return tokens
    }
}

extension Color {
    static func nestHex(_ raw: String, fallback: Color) -> Color {
        var hex = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if hex.hasPrefix("#") {
            hex.removeFirst()
        }
        guard hex.count == 6, let value = Int(hex, radix: 16) else {
            return fallback
        }
        return Color(
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255
        )
    }
}
