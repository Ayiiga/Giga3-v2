// Add this file to your generated Android Studio Compose project's source folder.
// Keep YOUR project's package declaration above these imports.
// In MainActivity.setContent, call: MaterialTheme { RevisionApp() }
// Uses the standard Empty Activity Compose template; no extra libraries required.
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp

private data class PracticeQuestion(
    val text: String, val options: List<String>, val answer: Int, val explanation: String
)
private val questions = listOf(
    PracticeQuestion("Which process changes liquid water into water vapour?",
        listOf("Condensation", "Evaporation", "Freezing", "Melting"), 1,
        "Evaporation changes liquid water into vapour."),
    PracticeQuestion("Which structure absorbs most water from soil?",
        listOf("Flower", "Fruit", "Root", "Seed"), 2,
        "Roots absorb water and dissolved minerals from soil.")
)

@Composable
fun RevisionApp() {
    val context = LocalContext.current
    val preferences = remember(context) {
        context.getSharedPreferences("revision-practice", android.content.Context.MODE_PRIVATE)
    }
    var screen by rememberSaveable { mutableStateOf("home") }
    var index by rememberSaveable { mutableIntStateOf(0) }
    var selected by rememberSaveable { mutableIntStateOf(-1) }
    var checked by rememberSaveable { mutableStateOf(false) }
    var score by rememberSaveable { mutableIntStateOf(0) }
    var best by rememberSaveable { mutableIntStateOf(preferences.getInt("best", 0)) }
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("My BECE Revision App", style = MaterialTheme.typography.headlineMedium)
        Text("Original practice questions — not official examination papers")
        when (screen) {
            "home" -> {
                Text("Choose Integrated Science to practise two questions.")
                Text("Best score: $best / ${questions.size}")
                Button(onClick = {
                    index = 0; selected = -1; checked = false; score = 0; screen = "practice"
                }) { Text("Start Integrated Science") }
            }
            "practice" -> {
                val question = questions[index]
                Text("Question ${index + 1} of ${questions.size}")
                Text(question.text, style = MaterialTheme.typography.titleLarge)
                question.options.forEachIndexed { optionIndex, option ->
                    Button(enabled = !checked, onClick = { selected = optionIndex }) {
                        Text(if (selected == optionIndex) "Selected: $option" else option)
                    }
                }
                Button(enabled = selected >= 0 && !checked, onClick = {
                    // Guard inside the handler as well as disabling the control.
                    if (!checked && selected >= 0) {
                        if (selected == question.answer) score++
                        checked = true
                    }
                }) { Text("Check answer") }
                if (checked) {
                    Text(if (selected == question.answer) "Correct. ${question.explanation}"
                         else "Incorrect. ${question.explanation}")
                    Button(onClick = {
                        if (index == questions.lastIndex) {
                            if (score > best) {
                                best = score
                                preferences.edit().putInt("best", best).apply()
                            }
                            screen = "results"
                        } else {
                            index++; selected = -1; checked = false
                        }
                    }) { Text(if (index == questions.lastIndex) "View results" else "Next question") }
                }
            }
            "results" -> {
                Text("Your score: $score / ${questions.size}", style = MaterialTheme.typography.headlineSmall)
                Text("Best saved score: $best / ${questions.size}")
                Button(onClick = {
                    index = 0; selected = -1; checked = false; score = 0; screen = "practice"
                }) { Text("Try again") }
                Button(onClick = { screen = "home" }) { Text("Home") }
            }
        }
    }
}
