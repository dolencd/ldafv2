export interface ServiceConfig {
    name: string,
    plugins?: Array<PluginConfig>,
    dependencies?: Array<string>,
    methods: Array<MethodConfig>
    typeCount?: number
}

export interface PluginConfig {
    name: string,
    src: string,
    config: any
}

export interface MethodConfig {
    name: string,
    type?: string,
    pluginConfig?: any,
    typeCount?: number
}

export interface ServiceInfo {
    name: string,
    typeCount: number,
    methods: Array<{
        name: string,
        type: string,
        typeCount: number
    }>
}

export interface MethodCallEvent {
    payload: Buffer,
    method: MethodConfig
}
