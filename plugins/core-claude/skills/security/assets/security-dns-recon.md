<security_dns_recon>

<apply_when>
External asset discovery is necessary and ownership of the named domains is explicitly approved.
</apply_when>

<inspect>
- Authoritative records, delegation, DNSSEC, and takeover risk.
- Approved subdomains, certificate transparency references, and stale services.
- Mail/security records and exposed administrative endpoints.
</inspect>

<tools>
Prefer passive/local evidence. Candidate tools include dig, dnsx, subfinder, amass, and approved certificate-transparency sources. Network queries and third-party sources require data-flow approval.
</tools>

<safety>
Ownership is a hard gate. Keep queries passive and bounded. Never expand from discovered names beyond approved domains.
</safety>

</security_dns_recon>
