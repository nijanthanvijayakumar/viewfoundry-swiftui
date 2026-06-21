import SwiftUI

struct ViewFoundryGeneratedView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Image(systemName: "slider.horizontal.3")
                .font(.title)
                .foregroundStyle(.secondary)

            Text("Settings")
                .font(.headline.bold())

            Text("Notifications")
                .font(.body)

            Text("Daily summary")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(20)
        .background(Color(.secondarySystemBackground))
    }
}
