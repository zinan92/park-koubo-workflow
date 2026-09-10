import subprocess
import unittest
from pathlib import Path
from unittest.mock import patch
import sys
import os
import json
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import test_workflow_guard as fixtures
from workflow_guard import Guard, Blocked, file_hash, read_json
from remotion_execution import contract, execute, receipts


class RemotionExecution(unittest.TestCase):
    def setUp(self):
        self.f = fixtures.Gates()
        self.f.setUp()
        self.addCleanup(self.f.doCleanups)
        self.f.review('visual-spec', self.f.check())

    def test_canvas_plan_blocked_before_implementation(self):
        self.f.plan['shots'][0]['engine'] = 'canvas'
        self.f.replan()
        with self.assertRaisesRegex(Blocked, 'before implementation'): self.f.check()

    def test_no_engine_declaration_blocked(self):
        del self.f.plan['shots'][0]['engine']
        self.f.replan()
        with self.assertRaises(Blocked): self.f.check()

    def test_missing_project_blocks(self):
        del self.f.manifest['stages']['visual-implementation']
        self.f.save()
        with self.assertRaises(KeyError): contract(Guard(self.f.p))

    def test_browser_helper_is_not_a_registered_entry(self):
        self.f.put('visual-implementation', 'entry', 'openBrowser("chrome")', 'index.ts')
        self.f.save()
        with self.assertRaisesRegex(Blocked, 'register'): contract(Guard(self.f.p))

    def test_changed_demo_binding_blocks(self):
        p = self.f.p / 'visual-implementation-contract.json'
        c = read_json(p);c['shots']['V1']['demo_sha256'] = 'wrong'
        self.f.put('visual-implementation', 'contract', c);self.f.save()
        with self.assertRaisesRegex(Blocked, 'exact ShotCraft demo'): contract(Guard(self.f.p))

    def test_updated_component_invalidates_receipt(self):
        self.f.put('visual-implementation', 'component', 'export const Shot = () => <span/>', 'Shot.tsx');self.f.save()
        with self.assertRaisesRegex(Blocked, 'stale Remotion'): receipts(Guard(self.f.p), 'visual-preview', 'preview')

    def test_unlisted_source_change_invalidates_receipt(self):
        (self.f.p / 'runtime/UntrackedRoot.tsx').write_text('export const Changed = () => <span/>')
        with self.assertRaisesRegex(Blocked, 'stale Remotion'): receipts(Guard(self.f.p), 'visual-preview', 'preview')

    def test_unrelated_remotion_layer_does_not_authorize_composite(self):
        from visual_preview import validate
        p = self.f.p / 'visual-preview-index.json'
        index = read_json(p)
        del index['shots']['V1']['comparisons'][0]['remotion_inputs']
        self.f.put('visual-preview', 'index', index);self.f.save()
        with self.assertRaisesRegex(Blocked, 'actual Remotion layer'):
            validate(Guard(self.f.p), self.f.check())

    def test_missing_receipts_block_h2(self):
        del self.f.manifest['stages']['visual-preview']['inputs']['remotion_receipts']
        self.f.save()
        with self.assertRaises(KeyError): self.f.check('present-spec')

    def test_changed_output_blocks(self):
        self.f.put('visual-preview', 'remotion-output', 'substitute output');self.f.save()
        with self.assertRaisesRegex(Blocked, 'output missing or stale'): receipts(Guard(self.f.p), 'visual-preview', 'preview')

    def run_render(self, run):
        out = self.f.p / 'analysis/visual-preview/shot.png'
        receipt = self.f.p / 'receipt.json'
        cli = self.f.p / 'runtime/node_modules/@remotion/cli/remotion-cli.js'
        cli.parent.mkdir(parents=True, exist_ok=True);cli.write_text('fixture')
        with patch('remotion_execution.subprocess.run', side_effect=lambda cmd, **kw: run(cmd, out)):
            execute(Guard(self.f.p), 'V1', 'still', 'preview', out, receipt, 'layer:V1', 0)
        return receipt

    def test_runner_uses_real_composition_cli_not_arbitrary_command(self):
        commands = []
        def render(cmd, out):
            commands.append(cmd);out.write_bytes(b'fixture-rendered-output')
        receipt = self.run_render(render)
        self.assertEqual(commands[0][0], 'node')
        self.assertEqual(commands[0][2], 'still')
        self.assertEqual(commands[0][4], 'Shot')
        self.assertEqual(read_json(receipt)['operation'], 'still')

    def test_failed_render_never_issues_receipt(self):
        def fail(cmd, out): raise subprocess.CalledProcessError(1, cmd)
        with self.assertRaises(subprocess.CalledProcessError): self.run_render(fail)
        self.assertFalse((self.f.p / 'receipt.json').exists())

    def test_preview_cannot_overwrite_production_path(self):
        with self.assertRaises(ValueError):
            execute(Guard(self.f.p), 'V1', 'still', 'preview', self.f.p / 'final/video.png', self.f.p / 'r.json', 'out', 0)

    def test_production_requires_h2_before_starting_process(self):
        with patch('remotion_execution.subprocess.run') as run:
            with self.assertRaises(OSError):
                execute(Guard(self.f.p), 'V1', 'render', 'production', self.f.p / 'final/shot.mp4', self.f.p / 'r.json', 'out', 0)
            run.assert_not_called()

    @unittest.skipUnless(os.environ.get('PARK_REMOTION_NODE_MODULES'), 'optional real Remotion integration; set installed node_modules path')
    def test_real_registered_react_composition_renders(self):
        rt = self.f.p / 'runtime'
        (rt / 'node_modules').symlink_to(os.environ['PARK_REMOTION_NODE_MODULES'], target_is_directory=True)
        self.f.put('visual-implementation', 'entry', "import {registerRoot} from 'remotion'; import {Root} from './Shot'; registerRoot(Root);", 'runtime/index.ts')
        self.f.put('visual-implementation', 'component', "import React from 'react'; import {Composition,AbsoluteFill,useCurrentFrame} from 'remotion'; const Shot=()=>{const frame=useCurrentFrame();return <AbsoluteFill style={{backgroundColor:'#172a32',color:'white',fontSize:30}}>React / Remotion {frame}</AbsoluteFill>}; export const Root=()=> <Composition id='Shot' component={Shot} width={320} height={240} fps={30} durationInFrames={30}/>;", 'runtime/Shot.tsx')
        c = read_json(self.f.p / 'visual-implementation-contract.json')
        c['shots']['V1']['duration_frames'] = 30
        self.f.put('visual-implementation', 'contract', c)
        (rt / 'tsconfig.json').write_text(json.dumps({'compilerOptions': {'jsx': 'react-jsx', 'esModuleInterop': True, 'target': 'ES2020', 'moduleResolution': 'node'}}))
        browser = os.environ.get('PARK_REMOTION_BROWSER')
        if browser:
            (rt / 'remotion.config.ts').write_text("import {Config} from '@remotion/cli/config'; Config.setBrowserExecutable(" + json.dumps(browser) + ');')
        self.f.save()
        out = self.f.p / 'analysis/visual-preview/real.mp4'
        receipt = self.f.p / 'real-receipt.json'
        execute(Guard(self.f.p), 'V1', 'render', 'preview', out, receipt, 'clip', 0)
        probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(out)]))
        self.assertEqual(int(probe['streams'][0]['nb_frames']), 30)
        self.assertEqual(probe['streams'][0]['width'], 320)
        self.assertEqual(read_json(receipt)['output_sha256'], file_hash(out))
        component = (rt / 'Shot.tsx').read_text().replace("backgroundColor:'#172a32',", '')
        self.f.put('visual-implementation', 'component', component, 'runtime/Shot.tsx')
        self.f.save()
        alpha_out = self.f.p / 'analysis/visual-preview/alpha.mov'
        execute(Guard(self.f.p), 'V1', 'render', 'preview', alpha_out, self.f.p / 'alpha-receipt.json', 'alpha', 0)
        rgba = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(alpha_out), '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'])
        self.assertIn(0, rgba[3::4])
        self.assertIn(255, rgba[3::4])


if __name__ == '__main__': unittest.main()
