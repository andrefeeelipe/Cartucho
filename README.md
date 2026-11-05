# Cartucho

Emulador minimalista para Android, do Atari 2600 ao PlayStation 2. Joga 100% offline; a rede só é usada, se você ativar, pelo **RetroAchievements** e pelo **backup de saves no Google Drive**.

> O Cartucho não inclui jogos nem BIOS e não indica onde obtê-los. Use apenas arquivos que você possui.

## Sistemas

Atari 2600 · Atari 7800 · Lynx · NES · SNES · Game Boy / Color · GBA · Master System · Game Gear · Mega Drive · Sega CD · 32X · PC Engine / CD · Neo Geo Pocket · WonderSwan · Arcade (FinalBurn Neo) · Nintendo 64 · Nintendo DS · PlayStation · PSP · Saturn · Dreamcast · PlayStation 2

Os emuladores (cores libretro) vão dentro do APK. Em **Ajustes > Sistemas neste aparelho** o app diz, com honestidade, o que roda bem, o que pode engasgar e o que não é suportado no seu celular.

## Como o APK é gerado

Tudo é compilado pelo **GitHub Actions** (gratuito), a cada envio para a branch `main`:

1. `scripts/fetch-deps.sh` baixa o `libretro.h`, o `rcheevos` e os cores oficiais do buildbot do libretro.
2. O Gradle compila o app e assina com a sua chave.
3. Os APKs saem em **Releases**, com o arquivo `SHA256SUMS.txt` para conferir a integridade.

### Chave de assinatura (uma vez só)

No repositório: **Settings > Secrets and variables > Actions > New repository secret**, crie:

| Nome | Valor |
|---|---|
| `CARTUCHO_KEYSTORE_PASSWORD` | a senha da chave |
| `CARTUCHO_KEYSTORE_B64` | o conteúdo de `keystore_base64.txt` |

Guarde o `cartucho.jks` em lugar seguro. Sem ele não é possível publicar atualizações que instalem por cima.

## Qual APK baixar

- `arm64-v8a` — quase todos os celulares atuais.
- `armeabi-v7a` — celulares antigos de 32 bits (sem PS2, Dreamcast e outros pesados).
- `x86_64` — Chromebooks e emuladores de PC.
- `universal` — funciona em qualquer um, mas é bem maior.

## Instalar no celular (sideload seguro)

1. No celular, abra o GitHub no navegador, entre na sua conta, vá em **Releases** e baixe o APK `arm64-v8a`.
2. Confira o SHA-256 (opcional): compare com o `SHA256SUMS.txt`.
3. Abra o arquivo baixado. O Android vai pedir para **permitir instalar apps desta fonte** só para o navegador ou gerenciador de arquivos que você usou. Permita, instale e depois desative essa permissão de novo.
4. O Play Protect pode avisar que o app é desconhecido: é normal para apps fora da Play Store. Toque em **Instalar mesmo assim**.

## Google Drive (opcional)

O login Google só funciona depois que o app é registrado no Google Cloud com a impressão digital (SHA-1) da sua chave:

1. Acesse console.cloud.google.com e crie um projeto (ex.: "Cartucho").
2. **APIs e serviços > Biblioteca**: ative a **Google Drive API**.
3. **Tela de consentimento OAuth**: tipo *Externo*, status *Em teste*, e adicione seu e-mail em **Usuários de teste**.
4. **Credenciais > Criar credenciais > ID do cliente OAuth > Android**:
   - Nome do pacote: `app.cartucho`
   - SHA-1: o valor que está no arquivo `SEGREDOS-DO-CARTUCHO.txt`
5. Pronto. No app: **Ajustes > Nuvem**, entre com a conta Google e escolha a pasta.

O app usa o escopo completo do Drive para você poder escolher qualquer pasta. No modo *Em teste* isso vale só para os usuários de teste que você adicionar (até 100), sem precisar de verificação do Google.

## Privacidade e segurança

- Permissões: Internet e estado da rede (só RA e Drive), vibração. Nenhum acesso amplo a arquivos: os jogos são abertos pelo seletor do Android.
- Sem anúncios, analytics, telemetria ou crash reporting remoto.
- Token do RetroAchievements cifrado no Android Keystore; a senha nunca é guardada.
- HTTPS obrigatório; APK assinado com esquemas v1, v2 e v3; R8 ativado.

## Limitações conhecidas

- PS2 (core Play!) ainda é exigente no Android: nem todo jogo roda bem.
- Nintendo DS: sem toque na tela inferior nesta versão.
- Compactados aceitos: .zip, .7z, .rar (RAR4), .tar, .gz, .bz2, .xz. RAR5 ainda não.
- Jogos em vários arquivos (`.cue/.bin`, `.gdi`, `.m3u`) precisam ser adicionados por **Adicionar pasta**.
- GameCube/Wii estão fora do escopo desta versão.

## Estrutura

```
app/src/main/cpp/        host libretro (C++/JNI), vídeo GLES, áudio, entrada, RetroAchievements
app/src/main/java/...    Kotlin + Jetpack Compose (interface, biblioteca, Drive, controles)
scripts/fetch-deps.sh    baixa dependências e cores
.github/workflows/       compilação e publicação automática
```

Licenças: veja `LICENSES.md`.
