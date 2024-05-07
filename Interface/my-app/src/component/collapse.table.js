import React, { useState, useEffect } from 'react';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Collapse from '@mui/material/Collapse';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import Paper from '@mui/material/Paper';

function Row({ eventData }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell align="left" style={{ width: '10%' }}>
          {eventData.eventName}
        </TableCell>
        <TableCell align="right" style={{ width: '90%' }}>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={2}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Test Details
              </Typography>
              <Table size="small" aria-label="test details">
                <TableHead>
                  <TableRow>
                    <TableCell>Index</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>API</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Payload</TableCell>
                    <TableCell>Expected Response</TableCell>
                    <TableCell>Actual Response</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell>Status Code</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                    {console.log("Event Data . test data", eventData.testData)};
                  {eventData.testData.map((test, index) => (
                    <TableRow key={index}>
                      <TableCell>{test.index}</TableCell>
                      <TableCell>{test.name}</TableCell>
                      <TableCell>{test.api}</TableCell>
                      <TableCell>{test.method}</TableCell>
                      <TableCell>{test.payload}</TableCell>
                      <TableCell>{test.expectedResponse}</TableCell>
                      <TableCell>{test.actualResponse}</TableCell>
                      <TableCell>{test.result}</TableCell>
                      <TableCell>{test.statusCode}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function CollapsibleTable() {
    const [streamData, setStreamData] = useState([]);
  
    useEffect(() => {
      const eventSource = new EventSource('http://localhost:5000/events');
      console.log("Event Source", eventSource);
  
      console.log('SSE connection established');
      console.log('EventSource readyState:', eventSource.readyState);

  
      eventSource.onmessage = (event) => {
        console.log('Message received:', event.data);
        try {
          const eventData = JSON.parse(event.data);
          console.log('Parsed data:', eventData);
          setStreamData((prevData) => [...prevData, eventData]);
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
    }, []);
  

  
  
  
  

  return (
    <TableContainer component={Paper}>
      <Table aria-label="collapsible table">
        <TableHead>
          <TableRow>
            <TableCell>Event Name</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {streamData.map((event, index) => (
            <Row key={index} eventData={event} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default CollapsibleTable;