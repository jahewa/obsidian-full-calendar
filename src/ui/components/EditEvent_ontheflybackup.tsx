import { DateTime } from "luxon";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { CalendarInfo, OFCEvent } from "../../types";
import { rrulestr } from "rrule";
import { rule} from "rrule";
import { sep } from "path";



function makeChangeListener<T>(
    setState: React.Dispatch<React.SetStateAction<T>>,
    fromString: (val: string) => T
): React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement> {
    return (e) => setState(fromString(e.target.value));
}


interface EditEventProps {
    submit: (frontmatter: OFCEvent, calendarIndex: number) => Promise<void>;
    readonly calendars: {
        id: string;
        name: string;
        type: CalendarInfo["type"];
    }[];
    defaultCalendarIndex: number;
    initialEvent?: Partial<OFCEvent>;
    open?: () => Promise<void>;
    deleteEvent?: () => Promise<void>;
    separate?: (frontmatter: OFCEvent, calendarIndex: number) => Promise<void>;
}


function addHyphenToDate(dateWithoutHyphen){
    let t = dateWithoutHyphen;
    t = t.slice(0,4)+"-"+t.slice(4,t.length);
    t = t.slice(0,7)+"-"+t.slice(7,t.length);
    return t;
}

export const EditEvent = ({
    initialEvent,
    submit,
    open,
    deleteEvent,
    separate,
    //catch here the potential skip date,
    openedAt,
    calendars,
    defaultCalendarIndex,
}: EditEventProps) => {
    console.debug("catch in EditEvent openedAt: ",openedAt)

    const [date, setDate] = useState(
        initialEvent
            ? initialEvent.type === "single"
                ? initialEvent.date
                : initialEvent.type === "rrule"
                ? initialEvent.startDate
                : ""
            : ""
    );
    const [endDate, setEndDate] = useState(
        initialEvent?.type=== "rrule"?
            initialEvent?.rrule.includes("UNTIL=") ?
                addHyphenToDate(initialEvent?.rrule.split("UNTIL=")[1]?.split(";")[0]) :
                "" :
            initialEvent?.endDate

    );

    let initialStartTime = "";
    let initialEndTime = "";
    if (initialEvent) {
        // @ts-ignore
        const { startTime, endTime } = initialEvent;
        initialStartTime = startTime || "";
        initialEndTime = endTime || "";
    }

    const [startTime, setStartTime] = useState(initialStartTime);
    const [endTime, setEndTime] = useState( initialEndTime);

    const [title, setTitle] = useState(initialEvent?.title || "");

    const [isRrule, setIsRrule] = useState(
        initialEvent?.type === "rrule" ? true : false
    );

    const [rruletext, setRruletext] = useState( 
        initialEvent?.type === "rrule" ? 
        initialEvent.rrule : ""
    );

    const [r_freq, setRruleFreq] = useState(
        
        initialEvent?.type === "rrule" ?
        initialEvent.rrule?.includes("DAILY") ? "FREQ=DAILY" :
        initialEvent.rrule?.includes("WEEKLY") ? "FREQ=WEEKLY" :
        initialEvent.rrule?.includes("MONTHLY") ? "FREQ=MONTHLY" :
        initialEvent.rrule?.includes("YEARLY") ? "FREQ=YEARLY" 
        :"FREQ=DAILY" 
        :"FREQ=DAILY"

    );

    const [r_interval, setRruleInterval] = useState(
        //1
        initialEvent?.type === "rrule" ?
        initialEvent.rrule?.split("INTERVAL=")[1]?.split(";")[0] :
        1
    );

    const [r_count, setRruleCount] = useState(        
        initialEvent?.type === "rrule" ?
        initialEvent.rrule?.split("COUNT=")[1]?.split(";")[0] :
        null
    );

    const [r_byDays, setRruleByDays] = useState(
        initialEvent?.type === "rrule" ?
            initialEvent.rrule?.includes("BYDAY=") ? 
                ("BYDAY="+initialEvent.rrule?.split("BYDAY=")[1]?.split(";")[0]) :
                "" :
            ""
    );

    const [r_dayMo, setRruleDayMo] = useState(
        initialEvent?.type === "rrule" ?
            initialEvent.rrule?.split("BYDAY=")[1]?.split(";")[0]?.includes("MO") ?
                true :
                false :
            false
    );

    const [r_dayTu, setRruleDayTu] = useState(
        initialEvent?.type === "rrule" ?
        initialEvent.rrule?.split("BYDAY=")[1]?.split(";")[0]?.includes("TU") ?
            true :
            false :
        false
    );

    const [r_dayWe, setRruleDayWe] = useState(
        initialEvent?.type === "rrule" ?
        initialEvent.rrule?.split("BYDAY=")[1]?.split(";")[0]?.includes("WE") ?
            true :
            false :
        false
    );

    const [r_dayTh, setRruleDayTh] = useState(
        initialEvent?.type === "rrule" ?
        initialEvent.rrule?.split("BYDAY=")[1]?.split(";")[0]?.includes("TH") ?
            true :
            false :
        false
    );

    const [r_dayFr, setRruleDayFr] = useState(
        initialEvent?.type === "rrule" ?
        initialEvent.rrule?.split("BYDAY=")[1]?.split(";")[0]?.includes("FR") ?
            true :
            false :
        false
    );

    const [r_daySa, setRruleDaySa] = useState(
        initialEvent?.type === "rrule" ?
        initialEvent.rrule?.split("BYDAY=")[1]?.split(";")[0]?.includes("SA") ?
            true :
            false :
        false
    );

    const [r_daySu, setRruleDaySu] = useState(
        initialEvent?.type === "rrule" ?
        initialEvent.rrule?.split("BYDAY=")[1]?.split(";")[0]?.includes("SU") ?
            true :
            false :
        false
    );

    const [r_skipDays,setRruleSkipDays] = useState(
        initialEvent?.type === "rrule" ?
            initialEvent?.skipDates : [] //in the event modal, the skipDates are in string format ( "2025-03-01,2025-03-02"). outside they are in array format
    );

    function calculateByDays(mo,tu,we,th,fr,sa,su){
        var days = ""   + (mo ? "MO,":"") + (tu ? "TU,":"") + (we ? "WE,":"") 
                        + (th ? "TH,":"") + (fr ? "FR,":"") + (sa ? "SA,":"") + (su ? "SU,":"");
        if(days.length > 0) days = "BYDAY=" + days.slice(0,-1); //remove last comma

        setRruleByDays(days);
        return days;
    }


    function calculateRruletext(freq,until,count,interval,byDays){

        setRruletext (
            "RRULE:"
            +freq + ";"
            +"INTERVAL="+String(interval)+";"
            +((String(until).length===10) ? "UNTIL="+String(until).replace(/-/g,'') +";" : "") //this check does not work yet
            +((count > 0) ? "COUNT="+String(count)+";" : "")
            +((String(byDays).length>1) ? String(byDays) +";" : "")
            +"WKST=MO"
        );
            
    }

    const [allDay, setAllDay] = useState(initialEvent?.allDay || false);

    const [calendarIndex, setCalendarIndex] = useState(defaultCalendarIndex);

    const [complete, setComplete] = useState( /*MARKED*/
        initialEvent?.type === "single" &&
            initialEvent.completed !== null &&
            initialEvent.completed !== undefined
            ? initialEvent.completed
            : false
    );

    const [isTask, setIsTask] = useState(
        initialEvent?.type === "single" &&
            initialEvent.completed !== undefined &&
            initialEvent.completed !== null
    );

    const titleRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (titleRef.current) {
            titleRef.current.focus();
        }
    }, [titleRef]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await submit(
            {
                ...{ title },
                ...(allDay ?
                    { allDay: true }
                    : { allDay: false, startTime: startTime || "", endTime }),
                ...(isRrule ? 
                    {
                        type: "rrule",
                        startDate: date,
                        rrule: rruletext, /*Put here some magic to process the rrule text*/
                        startTime : startTime,
                        endTime : endTime,
                        skipDates : r_skipDays,
                        //skipDates : r_skipDays.split(","),
                        //skipDates: "["+r_skipDays+"]",
                    } 
                    :
                    {
                          type: "single", //also used for task
                          date: date || "",
                          endDate: endDate || "",
                          completed: isTask ? complete : null,
                      }),

            },
            calendarIndex
        );
    };

    return (
        <div class="calEditModal">
            <p style={{ float: "right", margin:0 }} >
                {open && <button onClick={open}>Open Note</button>}
            </p>

            <form onSubmit={handleSubmit}>
                <p>
                    <fieldset>
                        <legend>Select a type</legend>
                            <input type="radio" id="single" name="type" value="single"
                            checked={!isTask && !isRrule} 
                            onChange={(e) => {
                                setIsTask(false);
                                setIsRrule(false);
                            }}
                            />
                            <label for="single">Event</label>

                            <input type="radio" id="task" name="type" value="task"
                            checked={isTask} 
                            onChange={(e) => {
                                setIsTask(e.target.checked);
                                setIsRrule(false);
                            }}
                            />
                            <label for="task">Task</label>

                            <input type="radio" id="rrule" name="type" value="rrule"
                            checked={isRrule}
                            onChange={(e) => {
                                setIsTask(false);
                                setIsRrule(e.target.checked);
                                calculateRruletext(r_freq,endDate,r_count,r_interval,r_byDays);
                            }}
                            />
                            <label for="rrule">Recurring</label>
                     </fieldset>
                </p>

                <p>
                    <input
                        ref={titleRef}
                        type="text"
                        id="title"
                        value={title}
                        placeholder={"Add title"}
                        required
                        //pattern="^[a-zA-Z0-9_.-ÄäÖöÜü]*$" //in line with obsidian file names
                        pattern="^[^\/\>\<\]\[\\\x22\,\;\|\?\*\%]+$"
                        onChange={makeChangeListener(setTitle, (x) => x)}
                    />

                    <select
                        id="calendar"
                        value={calendarIndex}
                        onChange={makeChangeListener(
                            setCalendarIndex,
                            parseInt
                        )}
                    >
                        {calendars
                            .flatMap((cal) =>
                                cal.type === "local" || cal.type === "dailynote"
                                    ? [cal]
                                    : []
                            )
                            .map((cal, idx) => (
                                <option
                                    key={idx}
                                    value={idx}
                                    disabled={
                                        !(
                                            initialEvent?.title === undefined ||
                                            calendars[calendarIndex].type ===
                                                cal.type
                                        )
                                    }
                                >
                                    {cal.type === "local"
                                        ? cal.name
                                        : "Daily Note"}
                                </option>
                            ))}
                    </select>
                </p>
                
                <p> 
                <div class="dateSelectors">
                    <input
                        type="date"
                        id="date" /*may need to differentiate between date and startDate here*/
                        value={date}
                        min="1000-01-01"
                        max="3000-01-01"
                        // @ts-ignore
                        onChange={makeChangeListener(setDate, (x) => x)}
                    />

                    <input 
                            type="date"
                            id="endDate"
                            value={endDate}
                            min="1000-01-01"
                            max="3000-01-01"
                            required={false}
                            // @ts-ignore
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                calculateRruletext(r_freq,e.target.value,r_count,r_interval,r_byDays);
                            }}
                            //onChange={makeChangeListener(setEndDate, (x) => x)}
                    />
                </div>
                </p>

                <p> 
                <div class="dateSelectors">
                    { allDay ? <></> : (
                            <>
                                <input
                                    type="time"
                                    id="startTime"
                                    value={startTime}
                                    required
                                    onChange={makeChangeListener(
                                        setStartTime,
                                        (x) => x
                                    )}
                                />
                                
                                <input
                                    type="time"
                                    id="endTime"
                                    value={endTime}
                                    required
                                    onChange={makeChangeListener(
                                        setEndTime,
                                        (x) => x
                                    )}
                                />
                            </>
                        )}
                </div>
                </p>
                
                <p>
                    <input
                        id="allDay"
                        checked={allDay}
                        onChange={(e) => setAllDay(e.target.checked)}
                        type="checkbox"
                    />
                    <label htmlFor="allDay"> All day</label>
                </p>


                {isTask && ( 
                    <p>
                        <input
                            id="taskStatus"
                            checked={
                                !(complete === false || complete === undefined)
                            }
                            onChange={(e) =>
                                setComplete(
                                    e.target.checked
                                        ? DateTime.now().toISO()
                                        : false
                                )
                            }
                            type="checkbox"
                        />
                        <label htmlFor="taskStatus"> Done</label>
                    </p>
                )}




                {isRrule&&(
                <>
                    <p>
                        <label for="r_interval">Repeat every </label>
                        <input id="r_interval" type="number" name="r_interval" min="1" value={r_interval} 
                        onChange={(e) => 
                            {setRruleInterval(e.target.valueAsNumber);
                            calculateRruletext(r_freq,endDate,r_count,e.target.valueAsNumber,r_byDays);
                            }}
                        />

                        <label for="r_freq"> </label>
                        <select name="r_freq" id="r_freq" value={r_freq}
                        onChange={(e) => 
                            {setRruleFreq(e.target.value);
                            calculateRruletext(e.target.value,endDate,r_count,r_interval,r_byDays);
                            }}
                        
                        >
                            <option value="FREQ=DAILY" selected={r_freq==="FREQ=DAILY"}>day</option>
                            <option value="FREQ=WEEKLY" selected={r_freq==="FREQ=WEEKLY"}>week</option>
                            <option value="FREQ=MONTHLY" selected={r_freq==="FREQ=MONTHLY"}>month</option>
                            <option value="FREQ=YEARLY" selected={r_freq==="FREQ=YEARLY"}>year</option>
                        </select>
                        
                        <label for="r_count"> (for total of </label>
                        <input id="r_count" type="number" name="r_count" min="1" value={r_count} 
                        onChange={(e) => 
                            {setRruleCount(e.target.valueAsNumber);
                            calculateRruletext(r_freq,endDate,e.target.valueAsNumber,r_interval,r_byDays);
                            }}
                        />
                        <label for="r_count"> )</label>

                    </p>

                    <p>
                        <div class="dayButtons">
                            <button type="button" value={r_dayMo} class={r_dayMo}
                            onClick={(e) =>{
                                calculateRruletext(r_freq,endDate,r_count,r_interval,
                                    calculateByDays(!r_dayMo,r_dayTu,r_dayWe,r_dayTh,r_dayFr,r_daySa,r_daySu)
                                );
                                setRruleDayMo(!r_dayMo);
                            }}
                            >MO</button> 

                            <button type="button" value={r_dayTu} class={r_dayTu}
                            onClick={(e) =>{
                                calculateRruletext(r_freq,endDate,r_count,r_interval,
                                    calculateByDays(r_dayMo,!r_dayTu,r_dayWe,r_dayTh,r_dayFr,r_daySa,r_daySu)
                                );
                                setRruleDayTu(!r_dayTu);
                            }}
                            >TU</button> 

                            <button type="button" value={r_dayWe} class={r_dayWe}
                            onClick={(e) =>{
                                calculateRruletext(r_freq,endDate,r_count,r_interval,
                                    calculateByDays(r_dayMo,r_dayTu,!r_dayWe,r_dayTh,r_dayFr,r_daySa,r_daySu)
                                );
                                setRruleDayWe(!r_dayWe);
                            }}
                            >WE</button> 

                            <button type="button" value={r_dayTh} class={r_dayTh}
                            onClick={(e) =>{
                                calculateRruletext(r_freq,endDate,r_count,r_interval,
                                    calculateByDays(r_dayMo,r_dayTu,r_dayWe,!r_dayTh,r_dayFr,r_daySa,r_daySu)
                                );
                                setRruleDayTh(!r_dayTh);
                            }}
                            >TH</button> 

                            <button type="button" value={r_dayFr} class={r_dayFr}
                            onClick={(e) =>{
                                calculateRruletext(r_freq,endDate,r_count,r_interval,
                                    calculateByDays(r_dayMo,r_dayTu,r_dayWe,r_dayTh,!r_dayFr,r_daySa,r_daySu)
                                );
                                setRruleDayFr(!r_dayFr);
                            }}
                            >FR</button> 

                            <button type="button" value={r_daySa} class={r_daySa}
                            onClick={(e) =>{
                                calculateRruletext(r_freq,endDate,r_count,r_interval,
                                    calculateByDays(r_dayMo,r_dayTu,r_dayWe,r_dayTh,r_dayFr,!r_daySa,r_daySu)
                                );
                                setRruleDaySa(!r_daySa);
                            }}
                            >SA</button> 

                            <button type="button" value={r_daySu} class={r_daySu}
                            onClick={(e) =>{
                                calculateRruletext(r_freq,endDate,r_count,r_interval,
                                    calculateByDays(r_dayMo,r_dayTu,r_dayWe,r_dayTh,r_dayFr,r_daySa,!r_daySu)
                                );
                                setRruleDaySu(!r_daySu);
                            }}
                            >SU</button> 
                        </div>

                    </p>
                    
                    <p>
                        <input disabled
                            type="text"
                            id="rruletext"
                            value={rruletext}
                            placeholder={"Add a rule"}
                            onChange={makeChangeListener(setRruletext, (x) => x)}
                        />
                    </p>
                    
                    {open&&(
                        <p>
                            <button type="button"
                            onClick={(e)=> {
                                var comma = r_skipDays.length === 0 ? "" : ",";
                                setRruleSkipDays((openedAt + comma + r_skipDays?.toString()).split(","));                              
                            }}
                            >Skip this occurance</button>
                            <label> </label>
                            <input
                                type="text"
                                id="r_skipDays"
                                value={r_skipDays?.toString()}
                                onChange={(e)=>{
                                    setRruleSkipDays(e.target.value.split(","));
                                }}
                            />
                            <label> </label>
                            <button type="button"
                            onClick={(e)=> {
                                setRruleSkipDays([]);
                            }}
                            >Reset skips</button>

                        </p>
                    )}
                </>

                )}
                

            
                <p
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        width: "100%",
                    }}
                >
                    <button type="submit"> Save Event </button>

                {open&&isRrule&&(
                    <>
                    <label> </label>
                    <button type="button"
                            onClick={(e) =>{
                                var comma = r_skipDays.length === 0 ? "" : ",";
                                var localSkipDays = (openedAt + comma + r_skipDays?.toString()).split(",");  
                                separate(
                                    {
                                        ...{ title },
                                        ...(allDay ?
                                            { allDay: true }
                                            : { allDay: false, startTime: startTime || "", endTime }),
                                        ...(isRrule ? 
                                            {
                                                type: "rrule",
                                                startDate: date,
                                                rrule: rruletext,
                                                startTime : startTime,
                                                endTime : endTime,
                                                skipDates : localSkipDays,
                                            } 
                                            :
                                            {
                                                  type: "single",
                                                  date: date || "",
                                                  endDate: endDate || "",
                                                  completed: isTask ? complete : null,
                                              }),
                        
                                    },
                                    calendarIndex
                                );
                            }}
                            >Separate this occurance</button>
                        </>
                        )}

                    
                    <span>
                        {deleteEvent && (
                            <button
                                type="button"
                                style={{
                                    backgroundColor:
                                        "var(--interactive-normal)",
                                    color: "var(--background-modifier-error)",
                                    borderColor:
                                        "var(--background-modifier-error)",
                                    borderWidth: "1px",
                                    borderStyle: "solid",
                                }}
                                onClick={deleteEvent}
                            >
                                Delete Event
                            </button>
                        )}
                    </span>
                </p>
            </form>
        </div>
    );
};
