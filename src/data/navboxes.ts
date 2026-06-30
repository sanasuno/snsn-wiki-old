export type NavboxLink = {
    text: string
    href: string
    external?: boolean
}

export type NavboxRow = {
    label: string
    links: NavboxLink[]
}

export type NavboxDef = {
    title: string
    titleHref?: string
    icon?: string
    rows: NavboxRow[]
}

export const navboxes: Record<string, NavboxDef> = {
    "sample": {
        title: "サンプル",
        titleHref: "/ja/wiki/sample",
        rows: [
            {
                label: "リンク",
                links: [
                    {
                        text: "サンプル",
                        href: "/ja/wiki/sample"
                    },
                    {
                        text: "テスト",
                        href: "/ja/wiki/test"
                    }
                ]
            },
            {
                label: "外部リンク",
                links: [
                    {
                        text: "外部リンク1",
                        href: "https://example.com",
                        external: true
                    }
                ]
            }
        ]
    }
}