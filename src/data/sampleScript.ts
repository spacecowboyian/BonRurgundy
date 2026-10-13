import readme from '../../README.md?raw'
import { tidyScript } from '../lib/tidy'

/** The sample script is this repo's README, tidied for reading aloud. */
export const SAMPLE_SCRIPT = tidyScript(readme)
