This file explains how Visual Studio created the project.

The following tools were used to generate this project:
- create-vite

The following steps were used to generate this project:
- Create react project with create-vite: `npm init --yes vite@latest medibooker.client -- --template=react  --no-rolldown --no-immediate`.
- Update `vite.config.js` to set up proxying and certs.
- Update `App` component to fetch and display weather information.
- Create project file (`medibooker.client.esproj`).
- Create `launch.json` to enable debugging.
- Create `tasks.json` to enable debugging.
- Add project to solution.
- Update proxy endpoint to be the backend server endpoint.
- Write this file.
