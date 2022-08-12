# vite-plugin-remote-scripts

Bundles your styles or scripts from remote urls with your app.

```html
<script data-remote-script src="http://example.com/library.js"></script>
```

To

```html
<img src="./node_modules/.remote-scripts/remote-script.c3b8e480.js" />
```


## Install

```bash
npm i vite-plugin-remote-scripts -D
```

```ts
// vite.config.ts
import RemoteScripts from 'vite-plugin-remote-scripts'

export default {
  plugins: [
    RemoteScripts()
  ]
}
```

## License

[MIT](./LICENSE) License © 2022
