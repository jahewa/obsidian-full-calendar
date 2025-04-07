import { Notice } from "obsidian";
import * as React from "react";
import { SetStateAction, useState } from "react";

import { CalendarInfo } from "../../types";

type SourceWith<T extends Partial<CalendarInfo>, K> = T extends K ? T : never;

interface BasicProps<T extends Partial<CalendarInfo>> {
    source: T;
}

function DirectorySetting<T extends Partial<CalendarInfo>>({
    source,
}: BasicProps<T>) {
    let sourceWithDirectory = source as SourceWith<T, { directory: undefined }>;
    return (
        <div className="setting-item-control">
            <input
                disabled
                type="text"
                value={sourceWithDirectory.directory}
                style={{
                    width: "100%",
                    marginLeft: 4,
                    marginRight: 4,
                }}
            />
        </div>
    );
}

function HeadingSetting<T extends Partial<CalendarInfo>>({
    source,
}: BasicProps<T>) {
    let sourceWithHeading = source as SourceWith<T, { heading: undefined }>;
    return (
        <div
            className="setting-item-control"
            style={{ display: "block", textAlign: "center" }}
        >
            <span>Under heading</span>{" "}
            <input
                disabled
                type="text"
                value={sourceWithHeading.heading}
                style={{
                    marginLeft: 4,
                    marginRight: 4,
                }}
            />{" "}
            <span style={{ paddingRight: ".5rem" }}>in daily notes</span>
        </div>
    );
}

function UrlSetting<T extends Partial<CalendarInfo>>({
    source,
}: BasicProps<T>) {
    let sourceWithUrl = source as SourceWith<T, { url: undefined }>;
    return (
        <div className="setting-item-control">
            <input
                disabled
                type="text"
                value={sourceWithUrl.url}
                style={{
                    width: "100%",
                    marginLeft: 4,
                    marginRight: 4,
                }}
            />
        </div>
    );
}

function NameSetting<T extends Partial<CalendarInfo>>({
    source,
}: BasicProps<T>) {
    let sourceWithName = source as SourceWith<T, { name: undefined }>;
    return (
        <div className="setting-item-control">
            <input
                disabled
                type="text"
                value={sourceWithName.name}
                style={{
                    width: "100%",
                    marginLeft: 4,
                    marginRight: 4,
                }}
            />
        </div>
    );
}

function Username<T extends Partial<CalendarInfo>>({ source }: BasicProps<T>) {
    let sourceWithUsername = source as SourceWith<T, { username: undefined }>;
    return (
        <div className="setting-item-control">
            <input
                disabled
                type="text"
                value={sourceWithUsername.username}
                style={{
                    width: "100%",
                    marginLeft: 4,
                    marginRight: 4,
                }}
            />
        </div>
    );
}

interface CalendarSettingsProps {
    setting: Partial<CalendarInfo>;
    onColorChange: (s: string) => void;
    deleteCalendar: () => void;
    pushCalendarUp: () => void;
}

export const CalendarSettingRow = ({
    setting,
    onColorChange,
    deleteCalendar,
    pushCalendarUp,
}: CalendarSettingsProps) => {
    const isCalDAV = setting.type === "caldav";
    return (
        <div className="setting-item">
            <button
                type="button"
                onClick={deleteCalendar}
                style={{ maxWidth: "15%" }}
            >
                ✕
            </button>

            <button
                type="button"
                onClick={pushCalendarUp} //MARKED calendar settings to change order
                style={{ maxWidth: "15%" }}
            >
                up
            </button>

            {setting.type === "local" ? ( 
                <DirectorySetting source={setting} />
            ) : setting.type === "dailynote" ? (
                <HeadingSetting source={setting} />
            ) : (
                <UrlSetting source={setting} />
            )}
            {isCalDAV && <NameSetting source={setting} />}
            {isCalDAV && <Username source={setting} />}
            <input
                style={{ maxWidth: "25%", minWidth: "3rem" }}
                type="color"
                value={setting.color}
                onChange={(e) => onColorChange(e.target.value)}
            />
        </div>
    );
};

interface CalendarSettingProps {
    sources: CalendarInfo[];
    submit: (payload: CalendarInfo[]) => void;
}
type CalendarSettingState = {
    sources: CalendarInfo[];
    dirty: boolean;
};
export class CalendarSettings extends React.Component<
    CalendarSettingProps,
    CalendarSettingState
> {
    constructor(props: CalendarSettingProps) {
        super(props);
        this.state = { sources: props.sources, dirty: false };
    }

    addSource(source: CalendarInfo) {
        this.setState((state, props) => ({
            sources: [...state.sources, source],
            dirty: true,
        }));
    }

    render() {
        return (
            <div style={{ width: "100%" }}>
                {this.state.sources.map((s, idx) => (
                    <CalendarSettingRow
                        key={idx}
                        setting={s}
                        onColorChange={(color) =>
                            this.setState((state, props) => ({
                                sources: [
                                    ...state.sources.slice(0, idx),
                                    { ...state.sources[idx], color },
                                    ...state.sources.slice(idx + 1),
                                ],
                                dirty: true,
                            }))
                        }
                        deleteCalendar={() =>
                            this.setState((state, props) => ({
                                sources: [
                                    ...state.sources.slice(0, idx),
                                    ...state.sources.slice(idx + 1),
                                ],
                                dirty: true,
                            }))
                        }

                        pushCalendarUp={() =>
                            idx>0&&
                            this.setState((state, props) => ({
                                sources: [ //MARKED, here the json is preparedto be edited
                                    ...state.sources.slice(0, idx-1),
                                    ...state.sources.slice(idx, idx+1),
                                    ...state.sources.slice(idx-1, idx),
                                    ...state.sources.slice(idx+1),
                                ],
                                dirty: true, //dirty marks, if a save is outstanding
                            }))
                        }

                    />
                ))}
                <div className="setting-item-control">
                    {this.state.dirty && ( //MARKED This is the submit / save control
                        <button
                            onClick={() => {
                                if (
                                    this.state.sources.filter(
                                        (s) => s.type === "dailynote"
                                    ).length > 1
                                ) {
                                    new Notice(
                                        "Only one daily note calendar is allowed."
                                    );
                                    return;
                                }
                                this.props.submit(
                                    this.state.sources.map(
                                        (elt) => elt as CalendarInfo
                                    )
                                );
                                this.setState({ dirty: false });
                            }}
                            style={{
                                backgroundColor: this.state.dirty
                                    ? "var(--interactive-accent)"
                                    : undefined,
                                color: this.state.dirty
                                    ? "var(--text-on-accent)"
                                    : undefined,
                            }}
                        >
                            {this.state.dirty ? "Save" : "Settings Saved"}
                        </button>
                    )}
                </div>
            </div>
        );
    }
}
