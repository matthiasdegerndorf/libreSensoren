# Libre 3 Sensor Manager

Eine Web-App zur Verwaltung von FreeStyle Libre 3 Sensoren.

## Features

- Sensoren erfassen (Seriennummer, Haltbarkeitsdatum, Setzdatum/Uhrzeit)
- Aktiv / Passiv Status
- Automatische Berechnung der Tragedauer (Setzdatum + 15 Tage)
- Fortschrittsanzeige pro Sensor
- Daten werden lokal im Browser gespeichert (localStorage)

## Lokal starten

```bash
npm install
npm run dev
```

## Auf GitHub Pages deployen

1. Repository auf GitHub erstellen
2. Diesen Ordner pushen
3. In den Repo-Einstellungen: **Settings → Pages → Source: GitHub Actions**
4. Beim nächsten Push auf `main` wird automatisch gebaut und deployt

Die App ist dann erreichbar unter:
`https://<dein-username>.github.io/<repo-name>/`
