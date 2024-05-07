const getData = ()=>{
    const eventSource = new EventSource('http://localhost:5000/events');
    console.log("Event Source", eventSource);

    console.log('SSE connection established');
    console.log('EventSource readyState:', eventSource.readyState);


    eventSource.onmessage = (event) => {
      console.log('Message received:', event.data);
      try {
        const eventData = JSON.parse(event.data);
        console.log('Parsed data:', eventData);
        // setStreamData((prevData) => [...prevData, eventData]);
      } catch (error) {
        console.error('Error parsing JSON:', error);
      }
    };
    console.log('EventSource readyState:', eventSource.readyState);
    eventSource.onerror = (error) => {
      console.error('Error occurred in SSE connection:', error);
    };

    return () => {
      eventSource.close();
      console.log('SSE connection closed');
    };
  }
export default getData;