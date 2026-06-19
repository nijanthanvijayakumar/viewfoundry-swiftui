import SwiftUI

@main
struct ViewFoundrySandboxApp: App {
    var body: some Scene {
        WindowGroup {
            SandboxView()
        }
    }
}

struct SandboxView: View {
    var body: some View {
        ZStack {
            Color(.systemBackground)
                .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 16) {
                Text("ViewFoundry Sandbox")
                    .font(.title.bold())

                Text("Replace this view with the current mockup target. Keep values explicit so screenshot review can compare spacing, typography, and color.")
                    .font(.body)
                    .foregroundStyle(.secondary)
            }
            .padding(24)
        }
    }
}
