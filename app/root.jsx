import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async () => {
    return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
};

export default function App() {
    const { apiKey } = useLoaderData();
    return (
        <html>
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width,initial-scale=1" />
                <link rel="preconnect" href="https://cdn.shopify.com/" />
                <link
                    rel="stylesheet"
                    href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
                />
                <Meta />
                <Links />
            </head>
            <body>
                <AppProvider isEmbeddedApp apiKey={apiKey}>
                    <NavMenu>
                        <a href="/app" rel="home">Home</a>
                        <a href="/app/settings">Settings</a>
                    </NavMenu>
                    <Outlet />
                </AppProvider>
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}
