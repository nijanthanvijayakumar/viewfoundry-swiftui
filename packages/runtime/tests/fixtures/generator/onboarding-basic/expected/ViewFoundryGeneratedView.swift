import SwiftUI

struct ViewFoundryGeneratedView: View {
    var body: some View {
        ZStack {
            Color(.systemBackground)
                .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 16) {
                Text("Habit rhythm")
                    .font(.title.bold())

                Text("Set a simple streak goal before your first check-in.")
                    .font(.body)
                    .foregroundStyle(.secondary)

                Button(action: {}) {
                    Text("Start")
                }
                .buttonStyle(.borderedProminent)
            }
            .padding(24)
        }
    }
}
