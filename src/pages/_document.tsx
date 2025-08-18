import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <link
            rel="icon"
            href="/gcs-logo-light.png"
            media="(prefers-color-scheme: light)"
          />
          <link
            rel="icon"
            href="/gcs-logo-dark.png"
            media="(prefers-color-scheme: dark)"
          />
          <link rel="apple-touch-icon" href="/gcs-logo-light.png" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
