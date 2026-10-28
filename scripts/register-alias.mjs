// Permite rodar os testes em Node puro: resolve o alias "@/..." do tsconfig.
import { register } from "node:module";

register("./alias-loader.mjs", import.meta.url);
