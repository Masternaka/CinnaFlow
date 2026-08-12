type ObjectWithSignals = {
    connect: (..._args: any[]) => number;
    disconnect: (_id: number) => void;
};

export default class SignalHandling {
    private readonly _signalsIds: { id: number; obj: ObjectWithSignals }[];

    constructor() {
        this._signalsIds = [];
    }

    public connect(
        obj: ObjectWithSignals,
        key: string,
        fun: (..._args: never[]) => void,
    ) {
        const signalId = obj.connect(key, fun);
        this._signalsIds.push({ id: signalId, obj });

        return signalId;
    }

    public disconnect(): boolean;
    public disconnect(_obj: ObjectWithSignals): boolean;
    public disconnect(obj?: ObjectWithSignals) {
        if (!obj) {
            const result = this._signalsIds.length > 0;
            this._signalsIds.forEach(({ id, obj: signalObject }) =>
                signalObject.disconnect(id),
            );
            this._signalsIds.length = 0;
            return result;
        } else {
            const signalIndex = this._signalsIds.findIndex(
                (signal) => signal.obj === obj,
            );
            if (signalIndex === -1) return false;

            const [{ id }] = this._signalsIds.splice(signalIndex, 1);
            obj.disconnect(id);
            return true;
        }
    }
}
