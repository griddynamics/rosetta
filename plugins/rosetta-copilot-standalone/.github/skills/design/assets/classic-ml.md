# Classic-ML design reference (asset of the `design` skill)

Applies to trained-model capability: feature engineering, training, serving, monitoring — non-LLM.

## Aspects to weigh

- Baseline first: a heuristic or trivial model as the reference; added complexity must beat it measurably or it does not ship
- Leakage as the default suspicion: future or label information in features, point-in-time-correct joins, time-based splits for temporal data, eval rows contaminating training; metrics too good are an accusation, not a result
- Train/serve skew killed by construction: one feature-computation source shared offline and online — not two implementations kept in sync by discipline
- Reproducibility: data snapshots, seeds, pinned environments; any production model rebuildable from lineage — data version, code, parameters
- The offline metric chosen for correlation with the online outcome, and that correlation validated by shadow or canary before real traffic
- Registry and rollback: promotion gates, instant model rollback as routine, not incident response
- Drift monitored on inputs and predictions; the delayed-label problem answered explicitly — what is watched during the weeks before ground truth arrives
- Retraining policy upfront: triggers, cadence, and who approves a model that retrains itself
- Fairness measured across affected segments when decisions touch people — for credit, hiring, insurance it outranks every other attribute and brings its own regulators
- Serving shape: batch scoring vs online inference vs embedded — latency, staleness, and cost pull in different directions
- Training data with personal information inherits the regulated-data dimension, including deletion reaching trained models

## Default priorities

Valid evaluation before model sophistication · reproducibility before iteration speed · rollback before retraining · segment metrics before aggregate ones.

## Standards worth naming

SR 11-7 model risk management (banking) · ECOA/FCRA (credit) · EEOC (hiring) · GDPR art. 22 · EU AI Act high-risk categories · model cards and datasheets.

## Easy to miss

The metric jump that was a leaked feature · the notebook-trained production model nobody can rebuild · offline and online features drifting apart silently · monitoring blind for weeks because labels lag · aggregate metric hiding a failing segment · rollback restoring the model but not its feature pipeline · seasonal patterns read as drift, drift read as seasonality.
