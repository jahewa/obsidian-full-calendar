import { Notice } from "obsidian";
import * as React from "react";
import { EditableCalendar } from "src/calendars/EditableCalendar";
import FullCalendarPlugin from "src/main";
import { OFCEvent } from "src/types";
import { openFileForEvent } from "./actions";
import { EditEvent } from "./components/EditEvent";
import ReactModal from "./ReactModal";

export function launchCreateModal(
    plugin: FullCalendarPlugin,
    partialEvent: Partial<OFCEvent>
) {
    const calendars = [...plugin.cache.calendars.entries()]
        .filter(([_, cal]) => cal instanceof EditableCalendar)
        .map(([id, cal]) => {
            return {
                id,
                type: cal.type,
                name: cal.name,
            };
        });
    new ReactModal(plugin.app, async (closeModal) =>
        React.createElement(EditEvent, { /*MARKED Edit Event called*/
            initialEvent: partialEvent,
            calendars,
            defaultCalendarIndex: 0,
            submit: async (data, calendarIndex) => {
                const calendarId = calendars[calendarIndex].id;
                try {
                    await plugin.cache.addEvent(calendarId, data);
                } catch (e) {
                    if (e instanceof Error) {
                        new Notice("Error when creating event: " + e.message);
                        console.error(e);
                    }
                }
                closeModal();
            },
        })
    ).open();
}


//MARKED helper function to get the openedAt date from view, expects Thu Aug 20 2025 as input.
function extractDate(input:string) {
    const match = input.match(/\b([A-Z][a-z]{2}) (\d{1,2}) (\d{4})\b/);
    if (!match) return null; // Return null if no date is found

    const months = {
        Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
        Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12"
    };

    const year = match[3];
    const month = months[match[1]];
    const day = match[2].padStart(2, "0"); // Ensure two-digit day

    return `${year}-${month}-${day}`;
}


export function launchEditModal(plugin: FullCalendarPlugin, eventId: string, openedAt: string = "", isAllDay:bool = false) { //MARKED, added openedAt

    const eventToEdit = plugin.cache.getEventById(eventId);
    if (!eventToEdit) {
        throw new Error("Cannot edit event that doesn't exist.");
    }

    //MARKED for skipDates
    console.debug("opened edit modal at: ",openedAt, "clean: ",extractDate(openedAt));
    if(eventToEdit.type==="rrule"){
       openedAt = extractDate(openedAt);
       if(isAllDay){ //need to hack this, skip day for all day events needs to be one day before
        var d = new Date(openedAt);
        d.setDate(d.getDate()-1);
        openedAt = d.toISOString().split('T')[0];
       }
    }
    else{
        openedAt = "";
    }

    const calId = plugin.cache.getInfoForEditableEvent(eventId).calendar.id;

    const calendars = [...plugin.cache.calendars.entries()]
        .filter(([_, cal]) => cal instanceof EditableCalendar)
        .map(([id, cal]) => {
            return {
                id,
                type: cal.type,
                name: cal.name,
            };
        });

    const calIdx = calendars.findIndex(({ id }) => id === calId);

    new ReactModal(plugin.app, async (closeModal) =>
        React.createElement(EditEvent, {
            initialEvent: eventToEdit,
            calendars,
            openedAt,
            defaultCalendarIndex: calIdx,
            submit: async (data, calendarIndex) => {
                try {
                    if (calendarIndex !== calIdx) {
                        await plugin.cache.moveEventToCalendar(
                            eventId,
                            calendars[calendarIndex].id
                        );
                    }
                    await plugin.cache.updateEventWithId(eventId, data);
                } catch (e) {
                    if (e instanceof Error) {
                        new Notice("Error when updating event: " + e.message);
                        console.error(e);
                    }
                }
                closeModal();
            },
            open: async () => {
                openFileForEvent(plugin.cache, plugin.app, eventId);
                console.debug("opening note");
                closeModal(); //MARKED, added here to autoclose after opening file
            },
            deleteEvent: async () => {
                try {
                    await plugin.cache.deleteEvent(eventId);
                    closeModal();
                } catch (e) {
                    if (e instanceof Error) {
                        new Notice("Error when deleting event: " + e.message);
                        console.error(e);
                    }
                }
            },

            //MARKED added here "separate occurance" for rrule events
            separate: async (data :OFCEvent, calendarIndex :number) => {

                var newEventData : OFCEvent = {
                    title: "sep. "+data.title,
                    type: "single",
                    date: openedAt,
                    allDay: data.allDay,
                    startTime: data.startTime,
                    endTime : data.endTime
                };

                const calendarId = calendars[calendarIndex].id;
                try {
                    await plugin.cache.addEvent(calendarId, newEventData);
                } catch (e) {
                    if (e instanceof Error) {
                        new Notice("Error when creating event: " + e.message);
                        console.error(e);
                    }
                }

                //update this instance with a skipdate, added in EditEvent.tsx
                try {
                    if (calendarIndex !== calIdx) {
                        await plugin.cache.moveEventToCalendar(
                            eventId,
                            calendars[calendarIndex].id
                        );
                    }
                    await plugin.cache.updateEventWithId(eventId, data);
                } catch (e) {
                    if (e instanceof Error) {
                        new Notice("Error when updating event: " + e.message);
                        console.error(e);
                    }
                }

                //close Modal
                closeModal();
            },

        })
    ).open();
}
