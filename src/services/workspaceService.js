import * as mockWorkspace from './mockWorkspace.js'
import * as nativeWorkspace from './nativeWorkspace.js'
import { isTauriRuntime } from '../utils/platform.js'

const service = isTauriRuntime() ? nativeWorkspace : mockWorkspace

export default service
