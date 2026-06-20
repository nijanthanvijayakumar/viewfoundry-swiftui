import SwiftUI

struct ViewFoundryGeneratedView: View {
    var body: some View {
        ZStack {
            Color(.systemBackground)
                .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 16) {
                Text("ViewFoundry Sandbox")
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)

                Text("Build a compact onboarding screen for a habit tracker.")
                    .font(.title.bold())

                Text("Mocked ViewFoundry pipeline output")
                    .font(.headline)
                    .foregroundStyle(.secondary)

                Text("iPhone 16 / iOS 18 / light")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding(24)
        }
    }
}
