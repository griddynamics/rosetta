<security_host_compliance>

<apply_when>
Host images, operating-system policy, workstation/server baselines, or runtime hardening are in scope.
</apply_when>

<inspect>
- Patch posture, service exposure, accounts, privilege, and remote access.
- Filesystem permissions, audit, logging, time, and integrity controls.
- Kernel/runtime hardening, endpoint protection, and secure boot.
- Benchmark applicability, exceptions, and compensating controls.
</inspect>

<tools>
Prefer approved local configuration evidence. Candidate tools include Lynis, OpenSCAP, osquery, InSpec, and provider-native inventory. Host access requires environment approval and least privilege.
</tools>

<evidence>
Retain host class, benchmark/profile/version, rule, observed state, exception, and environment without sensitive host data.
</evidence>

</security_host_compliance>
