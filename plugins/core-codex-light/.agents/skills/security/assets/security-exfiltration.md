<security_exfiltration>

<apply_when>
Controls against data egress require a bounded test in explicitly approved pre-production.
</apply_when>

<inspect>
- Egress policy, DNS/HTTP channels, proxy controls, and service endpoints.
- DLP/alerting behavior, token scope, and audit correlation.
- Encoding, chunking, redirect, and trusted-destination bypasses.
</inspect>

<safety>
Use synthetic non-sensitive markers only. Approve destination, volume, rate, protocol, duration, cleanup, observers, and stop conditions. Never test production or move real data.
</safety>

<evidence>
Retain marker identity, approved channel, timestamps, control/alert outcome, cleanup proof, and no real payload.
</evidence>

</security_exfiltration>
