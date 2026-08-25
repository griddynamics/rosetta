<security_containers>

<apply_when>
Dockerfiles, build contexts, image manifests, registries, or container runtime settings exist.
</apply_when>

<inspect>
- Base-image provenance, digest pinning, and vulnerability exposure.
- Root/user, capabilities, seccomp, mounts, and privilege.
- Build secrets, copied credentials, layers, and package residue.
- Minimal runtime contents, patch policy, and health behavior.
- Registry trust, signing, attestations, and SBOM availability.
</inspect>

<tools>
Prefer installed image/config scanners. Candidate examples include Trivy, Grype, Syft, Dockle, Hadolint, Cosign, and Docker Scout. Never pull/push or contact registries without approval.
</tools>

<evidence>
Retain image digest, platform, layer/config reference, package path, and provenance/attestation status.
</evidence>

</security_containers>
