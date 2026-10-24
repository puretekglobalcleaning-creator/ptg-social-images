stat-kit — black-and-gold stat card builder, runnable in a CLOUD session (no Mac folders needed).
Copied 2026-10-24 from "Brand Assets/build" on Donta's Mac. The Mac copy is still the original for the
cleaning task; keep the two in sync if stat_card.py changes.

PTG Multiservices card:
  python3 stat-kit/build/stat_card.py multiservices/multiservices_stat_<YYYYMMDD>.png \
    --eyebrow "SOURCE IN CAPS" --stat "26%" --subhead "SHORT ALL-CAPS LINE" \
    --headline "One or two short sentences." --supporting "One or two muted sentences." \
    --cta-file stat-kit/build/cta_multiservices_credit.txt   (AI lane: cta_multiservices_ai.txt) \
    --logo stat-kit/multiservices-logo.png
ALWAYS pass --logo and --cta-file for Multiservices. Never substitute fonts.
