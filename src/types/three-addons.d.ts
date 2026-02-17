declare module 'three/addons/misc/GPUComputationRenderer.js' {
    import { WebGLRenderer, Texture, Variable } from 'three';
    export class GPUComputationRenderer {
        constructor(width: number, height: number, renderer: WebGLRenderer);
        createTexture(): Texture;
        addVariable(name: string, shader: string, texture: Texture): Variable;
        setVariableDependencies(variable: Variable, dependencies: Variable[]): void;
        init(): string | null;
        compute(): void;
        getCurrentRenderTarget(variable: Variable): { texture: Texture };
    }
}
