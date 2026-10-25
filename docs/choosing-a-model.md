# Choosing a model from where you are

The demo is at https://github.com/JaimeGonzalezVallejo/model-jumps-demo

Model comparisons arrive as leaderboards. That format answers who is best in
general, which is not the question you have once you already work with a model.
Yours is narrower: given the model and reasoning effort I use now, which change
is worth making?

A leaderboard also hides the direction of the trade. A model that scores higher
but costs three times as much is an upgrade for some tasks and a waste for
others, and the table does not say which. The moves people actually make are
few: spend more to get more, spend less and accept less, or find a version that
gives you more without costing more. Those are separate searches, and they have
different answers.

This demo works from one configuration at a time. It takes your model and
reasoning effort plus three measurements: an intelligence score, API cost per
task, and measured end-to-end time. Then it proposes at most one move in each
of four directions.

- More capable: any configuration with a higher score, whatever it costs.
- More capable, no slower: the same, limited to configurations whose measured
  time is not longer than yours.
- Cheaper: any configuration that costs less per task.
- Cheaper, no slower: cheaper and not slower.

"Not slower" is a filter, not a preference. If your configuration answers in 25
seconds and a candidate takes 40, the candidate does not appear in those two
directions at all. Equality counts as eligible, so a move that costs more but
takes exactly as long still shows up.

Each direction can be read under two strategies. Conservative minimises what
you give up. To move up, it looks for a configuration with a higher score that
costs no more than yours. If none exists, it takes the cheapest one that does
score higher, so you buy the smallest possible increase in spend. Moving down
works the other way: it prefers a cheaper configuration that keeps your score,
and if that does not exist, it keeps the highest score it can among the cheaper
options.

Best value asks which move gives the most per unit of change. For an upgrade,
it divides the extra cost by the points gained and takes the smallest ratio.
For a saving, it divides the cost saved by the points lost and takes the
largest. A direct improvement, meaning more capability at no extra cost or a
lower bill with no loss, always wins over a good ratio. A direction with no
candidate stays empty, and nothing is invented to fill it.

Here is a real pair from the demo's synthetic data. Starting from a
configuration at 55.0 intelligence, 0.45 USD per task and 25 seconds, the
cheapest Conservative move costs fifteen cents less, gives up five points and
takes ten seconds longer. Best value instead picks one that costs thirty cents
less, gives up ten points and is fifteen seconds faster. Both answers are
correct. You are choosing which of those two trades you can live with, and the
second one looks better only if you have decided that ten points are worth
losing.

You can also use your own measurements. If you have measured several
configurations on your own task, paste the rows into the page and pick the one
you use today. The score can be anything consistent: an eval result, a pass
rate, whatever you trust. Nothing is uploaded or stored, because the whole
thing is a static page.

A few limitations. A difference on an intelligence index does not guarantee a
better result on your task, and small differences can be noise. API cost per
task is not your subscription bill. Measured time is a benchmark number, not a
promise of latency. Best value can recommend a large jump. Reasoning efforts
need their own measurements before anyone can claim anything about them.

So the tool is a filter for narrowing candidates before you test them yourself.
It will not tell you which model is best. It gives you up to four
recommendations, one per direction, and tells you what you would trade to try
each one.
