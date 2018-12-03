import {render} from "react-dom";
import * as React from "react";
import {RefObject} from "react";
import {canvas} from "three/detector";
// @ts-ignore
import saveAs from 'save-as';
import {IExportedQuad, IQuad} from "./TexQuad";
import {App} from "./App";
import {Opt} from "./TypescriptUtils";
import {rect_minMax_to_scaleOrigin} from "./Math";

interface State {
    quad: Opt<IQuad>,
    showLeftBar: boolean,
    showRightBar: boolean,
}

class Page extends React.Component<{}, State> {
    private _canvasRef: RefObject<HTMLCanvasElement> = React.createRef();
    private _prevImgUrl: string | undefined;

    private _app: Opt<App>;

    constructor(props: State) {
        super(props);

        this.state = {
            quad: undefined,
            showLeftBar: true,
            showRightBar: true
        }
    }

    componentDidMount() {
        const canvas = this._canvasRef.current;
        if (!canvas) {
            alert("Couldn't find canvas!");
            return;
        }

        this._app = new App(canvas, this.onChangeQuad);
    }

    onChangeQuad = (quad: Opt<IQuad>) => {
        this.setState({quad: quad});
    };

    onChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const file = e.target.files[0];

        if (this._prevImgUrl) {
            URL.revokeObjectURL(this._prevImgUrl);
        }

        const imgUrl = URL.createObjectURL(file);
        this._prevImgUrl = imgUrl;


        if (this._app) {
            this._app.setNewSpriteSheet(imgUrl);
        }
    };

    onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const file = e.target.files[0];

        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result !== "string") return;

            try {
                const quads: IExportedQuad[] = JSON.parse(reader.result);

                if (this._app) {
                    this._app.importQuads(quads);
                }
            } catch (err) {
                console.error(err);
                alert(err);

            }
        };

        reader.readAsText(file);
    };

    onExport = () => {
        if (!this._app) return;
        const str = this._app.exportQuads();

        let blob = new Blob([str], {type: "application/json"});
        saveAs(blob, "spritesheet.json");
    };

    onToggleLeftBar = () => {
        this.setState((old) => ({showLeftBar: !old.showLeftBar}));
    };

    onToggleRightBar = () => {
        this.setState((old) => ({showRightBar: !old.showRightBar}));
    };

    onShowHelp = () => {
        window.open("https://github.com/SSStormy/spriteatlas/blob/master/README.md", "_blank");
    };

    render() {
        const quad = this.state ? this.state.quad : undefined;

        let quadWidget: any = null;

        const InputWidget = ({type, getter, setter}: any) => {
            if (!quad) return <></>;

            const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                if (quad) setter(e.target.value);
            };

            return <input type={type} defaultValue={getter()} onChange={onChange}/>
        };

        if (quad) {
            const {scale} = quad;

            quadWidget = (
                <div style={{position: "absolute", right: "16px", top: "16px"}}>
                    <input type="button" onClick={this.onToggleRightBar} value={this.state.showRightBar ? "Hide" : "Show"}/>

                    {this.state.showRightBar && <>
                        <InputWidget type="text" getter={() => quad.quadName}
                                     setter={(val: string) => quad.quadName = val}/>
                        <p>Scale ({scale.x}; {scale.y})px</p>
                    </>
                    }
                </div>
            )
        }

        const leftbar = (
            <div style={{position: "absolute", top: "16px", left: "16px"}}>
                <input type="button" onClick={this.onToggleLeftBar} value={this.state.showLeftBar ? "Hide" : "Show"}/>

                {this.state.showLeftBar && <>
                    <div>
                        <span>Image:</span>
                        <input type="file" onChange={this.onChangeFile}/>
                    </div>

                    <div>
                        <span>Atlas (auto-imports)</span>
                        <input type="file" onChange={this.onImport}/>
                    </div>

                    <input type="button" onClick={this.onExport} value="Export Atlas"/>

                    <div>
                        <input type="button" onClick={this.onShowHelp} value="Help"/>
                    </div>
                </>
                }
            </div>
        );

        return (
            <div style={{position: "relative", overflow: "hidden", height: "100vh", width: "100%"}}>
                <canvas ref={this._canvasRef}/>
                {leftbar}
                {quadWidget}
            </div>

        )
    }
}

render(<Page/>, document.getElementById("root"));

