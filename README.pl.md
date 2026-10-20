# DSH Mobile Remote

[English](README.md) | [Polski](README.pl.md) | [简体中文](README.zh-CN.md)

Uzyskaj dostęp do lokalnego interfejsu WWW DeepSeek Harness ze sparowanego telefonu przez Relay, korzystając wyłącznie z połączeń wychodzących.

> **Projekt społecznościowy:** to nieoficjalny projekt, rozwijany i utrzymywany niezależnie przez społeczność. Nie został sprawdzony ani zatwierdzony przez DeepSeek i nie jest objęty wsparciem DeepSeek.

**Pełny projekt, podpisany plik APK dla Androida i pakiet do prywatnego wdrożenia Relay:** [DSH Mobile Suite](https://github.com/april-jk/dsh-mobile-suite)

![Ustawienia DSH Mobile Remote w DeepSeek Harness](docs/images/remote-access-settings.png)

## Zgodność

Bieżące wydanie przetestowano z `@deepseek-ai/dsh@0.1.0-rc.6`. DeepSeek Harness jest w fazie Developer Preview i może wprowadzać niezgodne zmiany interfejsu wtyczek. CI używa tej konkretnej wersji, aby zmiany zgodności były widoczne.

Wymagania:

- Node.js 18 lub nowszy
- DeepSeek Harness `0.1.0-rc.6`
- Telefon z aplikacją towarzyszącą DSH Mobile
- Dostęp HTTPS do skonfigurowanego Relay

## Instalacja

Zalecaną publiczną metodą instalacji jest niezmienny tag GitHub. Nie wymaga ona globalnej instalacji DSH ani lokalnego katalogu wtyczki:

```bash
npx @deepseek-ai/dsh plugin --profile web add "github:april-jk/dsh-mobile-plugin#v0.1.9"
npx @deepseek-ai/dsh web
```

Każde wydanie GitHub zawiera też gotowy plik `.tgz`. DSH może zainstalować go bezpośrednio z adresu wydania — bez ręcznego pobierania ani podawania lokalnej ścieżki:

```bash
npx @deepseek-ai/dsh plugin --profile web add "https://github.com/april-jk/dsh-mobile-plugin/releases/download/v0.1.9/april-jk-dsh-mobile-0.1.9.tgz"
npx @deepseek-ai/dsh web
```

Metadane pakietu są przygotowane do publikacji w npm, ale `@april-jk/dsh-mobile` nie został jeszcze opublikowany w publicznym rejestrze npm. Po pierwszej publikacji polecenie instalacji z rejestru będzie następujące:

```bash
npx @deepseek-ai/dsh plugin --profile web add "@april-jk/dsh-mobile@<published-version>"
npx @deepseek-ai/dsh web
```

Odinstalowanie:

```bash
npx @deepseek-ai/dsh plugin --profile web remove @april-jk/dsh-mobile
```

Do lokalnego rozwijania sklonuj repozytorium i pozwól powłoce przekazać bieżącą ścieżkę:

```bash
git clone https://github.com/april-jk/dsh-mobile-plugin.git
cd dsh-mobile-plugin
npm ci
npm run build
npx @deepseek-ai/dsh plugin --profile web add "$PWD"
npx @deepseek-ai/dsh web
```

## Parowanie telefonu

W lokalnym interfejsie WWW DSH otwórz **Ustawienia > Dostęp zdalny** i zeskanuj kod QR aparatem iPhone’a lub aplikacją mobilną. Nowe kody QR otwierają bezpośrednio klienta przeglądarkowego Relay. Jednorazowy kod i klucz szyfrowania end-to-end pozostają we fragmencie adresu URL i nie są przesyłane w żądaniu strony. Sam sześciocyfrowy kod nie wystarcza. Przy kolejnych uruchomieniach DSH ponownie wykorzystuje dane uwierzytelniające urządzenia zapisane w `~/.dsh-remote/config.json`, z uprawnieniami dostępu wyłącznie dla właściciela.

Na tej samej stronie ustawień można usunąć parowanie. Usunięcie unieważnia dane uwierzytelniające urządzenia w Relay, rozłącza aktywny dostęp zdalny i usuwa lokalne dane uwierzytelniające dopiero po potwierdzeniu operacji przez Relay. Polecenie `dsh-mobile unpair` zapewnia to samo działanie, gdy interfejs WWW jest niedostępny.

## Język interfejsu i motyw

Strona ustawień wtyczki obsługuje angielski, polski i chiński uproszczony. Domyślnie używa języka systemu lub przeglądarki; nieobsługiwany język oznacza angielski. Można tam wybrać **System / przeglądarka**, **English**, **Polski** lub **简体中文**. Wybór jest zapisywany lokalnie w danej przeglądarce, jeśli pamięć lokalna jest dostępna. Nie zmienia konta, parowania ani danych uwierzytelniających.

Strona plików zdalnych nie ma własnego przełącznika języka ani motywu. Aplikacja mobilna otwiera ją z wybranym językiem i motywem jasnym lub ciemnym, więc oba ustawienia pochodzą z aplikacji. Daty, godziny i rozmiary plików są formatowane zgodnie z wybranym językiem. Nazwy urządzeń, ścieżki, treść plików, adresy URL i kody techniczne nie są tłumaczone.

## Sieć i przetwarzanie danych

- DSH nadal nasłuchuje na `127.0.0.1:3080`; wtyczka nigdy nie tworzy publicznego portu nasłuchującego.
- Domyślnie komputer nawiązuje wychodzące połączenie WSS z `https://relay.dshmobile.online`. Ustaw `DSH_RELAY` przed uruchomieniem DSH, aby używać innego zgodnego Relay.
- Treść HTTP, SSE i WebSocket jest szyfrowana end-to-end między aplikacją mobilną a Companion za pomocą AES-256-GCM. Relay przekazuje tylko zaszyfrowane ramki, a TLS dodatkowo chroni metadane połączenia podczas transmisji.
- Wersja 0.1.9 używa klucza współdzielonego przekazanego przez kod QR i nie zapewnia utajniania z wyprzedzeniem (forward secrecy). Jeśli kod QR lub którykolwiek z punktów końcowych mógł zostać przejęty, usuń parowanie i sparuj urządzenie ponownie.
- Wtyczka zapisuje token urządzenia Relay lokalnie w `~/.dsh-remote/config.json` i nigdy nie wysyła go do klienta mobilnego.
- Relay zapisuje ograniczony zestaw metadanych telefonu i czasy dostępu na potrzeby historii dostępu. Nie utrwala treści żądań ani odpowiedzi DSH.
- Instalacja tego pakietu wyłącza natywny selektor katalogów DSH i włącza selektor przeglądarkowy, aby zdalna przeglądarka mogła wybrać katalog bez otwierania Findera lub innego natywnego okna dialogowego.

Dla prywatnego Relay uruchom DSH z tym samym źródłem HTTPS, które skonfigurowano w aplikacji mobilnej:

```bash
DSH_RELAY=https://relay.example.com npx @deepseek-ai/dsh web
```

## Polecenia samodzielne

Awaryjny interfejs CLI jest instalowany jako `dsh-mobile` i obsługuje `start`, `pair`, `status`, `check-update`, `update` oraz `unpair`. Strona ustawień DSH okresowo sprawdza oficjalne wydania i umożliwia aktualizację jednym kliknięciem na komputerze z uruchomionym DSH. Po aktualizacji uruchom DSH ponownie, aby wczytać nową wtyczkę. Żądania aktualizacji są dozwolone tylko lokalnie i korzystają wyłącznie ze zweryfikowanych tagów z oficjalnego repozytorium wtyczki.

## Rozwijanie projektu

```bash
npm ci
npm run build
npm test
npm pack --dry-run
```

Katalog `dist/` jest celowo wersjonowany, aby instalacje z GitHub zawierały kompletną wtyczkę bez wykonywania skryptów cyklu życia. CI uruchamia budowanie, testy, kontrolę aktualności pakietu i kontrolę pakowania npm w Node.js 18, 20 oraz 22. Sprawdza też instalację z ustaloną wersją DSH Developer Preview.

Aby opublikować wydanie, zaktualizuj `package.json` i `package-lock.json`, przebuduj `dist/` i wypchnij tag odpowiadający dokładnie `v<package.version>`. Proces dla tagu ponawia wszystkie kontrole wydania, po czym tworzy niezmienne wydanie GitHub z gotowym archiwum npm i plikiem `SHA256SUMS`. Ponowne uruchomienie powiedzie się tylko wtedy, gdy istniejący zestaw plików i zawartość obu plików są identyczne; nigdy nie nadpisuje istniejącego pliku. Niezgodny tag powoduje błąd przed przesłaniem jakichkolwiek plików.

Publikacja w npm jest domyślnie wyłączona. Opiekunowie repozytorium mogą ją włączyć, ustawiając zmienną Actions `NPM_PUBLISH_ENABLED` na `true` i dodając sekret Actions `NPM_TOKEN` z uprawnieniami publikacji `@april-jk/dsh-mobile`. Jeśli brakuje któregokolwiek z tych ustawień, wydania GitHub nadal powstają normalnie, a proces nie próbuje publikacji w npm.

## Widoczność w społeczności

Repozytorium powinno mieć tematy GitHub `dsh-plugin` i `deepseek-harness`. W oficjalnej kategorii dyskusji o wtyczkach pojedynczy wpis o projekcie może mieć tytuł:

`DSH | DSH Mobile Remote | Access your local DSH Web UI from a paired phone`

Gotowy opis projektu do opublikowania znajduje się w [`docs/SHOW-YOUR-PLUGIN.md`](docs/SHOW-YOUR-PLUGIN.md).

## Licencja

[MIT](LICENSE)
