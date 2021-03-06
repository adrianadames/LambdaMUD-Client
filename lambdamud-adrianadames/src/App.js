import React, { Component } from 'react';
import { Route, Link, Redirect } from 'react-router-dom';
import styled from 'styled-components';
import './App.css';
import RoomInfo from './Components/RoomInfo';
import RoomActivity from './Components/RoomActivity';
import CommandInput from './Components/CommandInput';
import Register from './Components/Register';
import Login from './Components/Login';
import Dashboard from './Components/Dashboard';
import Pusher from 'pusher-js';
import axios from 'axios';
import Initialize from './Components/Initialize';
import Home from './Components/Home';
import host from '../src/host';

class App extends Component {
  constructor() {
    super();
    this.state = {
      registerUsername: '',
      registerPassword1: '',
      registerPassword2: '',
      loginUsername: '',
      loginPassword: '',
      registered: false,
      loggedIn: false,
      user_id:null,
      playerID: '',
      playerUUID: '',
      playerName: '',
      roomId: '',
      roomTitle: '',
      roomDescription: '',
      namesOfPlayersInRoom: [],
      uuidsOfPlayersInRoom: [],
      commandInput: '',
      roomActivity: [],
      errorMessage:null, 
      viewInstructions: false
    };
  };

  componentDidMount() {
    let token = localStorage.getItem('key');
    let user_id = localStorage.getItem('user_id');
    let config = {
      headers: {
        Authorization: `Token ${token}`
      }
    }

    if (token && user_id) {
      this.setState({loggedIn:true});
      this.initializeSubmitHandler()
    }    
  }
  
  toggleViewInstructions = () => {
    this.setState(prevState => ({
      viewInstructions:!prevState.viewInstructions
    }));
  }

  inputChangeHandler = e => {
    e.preventDefault();
    const {name, value} = e.target;

    this.setState({[name]: value});
  }

  registerSubmitHandler = e => {
    e.preventDefault();
    let registerData = {
      'username': this.state.registerUsername,
      'password1': this.state.registerPassword1,
      'password2': this.state.registerPassword2
    };
    axios
      .post(`${host}/api/registration`, registerData)
      .then(res => {
        if (res.data.error){
          this.setState({errorMessage:res.data.error});
        }
        else {
          
          const key = res.data['key'];
          const user_id = res.data.user_id
          
          localStorage.setItem('key', key);
          localStorage.setItem('user_id', user_id);
          
          this.setState({registered: true, loggedIn:true, errorMessage:null});
          return null;
        }
      })
      .then(res => {
        this.initializeSubmitHandler();
      })
      .catch(err => {
        console.error('Axios failed');
      })
  }

  loginSubmitHandler = e => {
    e.preventDefault();
    let loginData = {
      'username': this.state.loginUsername,
      'password': this.state.loginPassword
    }
    axios
      .post(`${host}/api/login`, loginData)
      .then(res => {
        if (res.data.error){
          this.setState({errorMessage:res.data.error});
        }
        else {
          const key = res.data['key'];
          const user_id = res.data['user_id'];
          localStorage.setItem('key', key);
          localStorage.setItem('user_id', user_id);
          this.setState({loggedIn:true, errorMessage:null});
          let token = localStorage.getItem('key');
          let config = {
            headers: {
              Authorization: `Token ${token}`
            }
          }
          this.initializeSubmitHandler();
        }
      })
      .catch(err => {
        console.error('Axios failed :', err.response);
      })
  }

  logoutSubmitHandler = e => {
    e.preventDefault();
    localStorage.removeItem('key');
    localStorage.removeItem('user_id');
    this.setState({loggedIn:false})
  }

  updateRoomActivity = (activity) => {
    let roomActivityCopy = this.state.roomActivity;
    roomActivityCopy.push(activity);
    this.setState({roomActivity: roomActivityCopy});
  }

  initializeSubmitHandler = () => {
    let token = localStorage.getItem('key');
    let config = {
      headers: {
        Authorization: `Token ${token}`
      }
    }

    axios
      .get(`${host}/api/adv/init`, config)
      .then(res => {

        const PUSHER_KEY = process.env.REACT_APP_PUSHER_KEY;
        const PUSHER_CLUSTER = process.env.REACT_APP_PUSHER_CLUSTER;
        const socket = new Pusher(PUSHER_KEY, {
          cluster: PUSHER_CLUSTER,
        });
        const channel = socket.subscribe(`p-channel-${res.data.uuid}`);

        let updateRoomActivityCopy = this.updateRoomActivity;

        channel.bind('sayEvent', function(data) {
          updateRoomActivityCopy(data['message']);
        });
        channel.bind('broadcast', function(data) {
          updateRoomActivityCopy(data['message']);
        });
        return res;
      })
      .then(res=> {
        this.setState({
          playerUUID: res.data.uuid,
          playerName:res.data.name,
          roomTitle: res.data.title,
          roomDescription: res.data.description,
          namesOfPlayersInRoom: res.data.players,
        })
      })
      .catch(err => {
        console.error('Axios failed: ', err.response);
      })
  }

  commandInputSubmitHandler = (e) => {
    e.preventDefault();
    let commandInput = this.state.commandInput.slice();

    let moveCommandRegex = new RegExp('(?<=\/m |\/move ).*');
    let sayCommandRegex = new RegExp('(?<=\/s |\/say ).*');

    // if moveCommandRegex result isn't null, user entered a move command
    if (commandInput.match(moveCommandRegex)) {
        let moveDirection = commandInput.match(moveCommandRegex)[0];
        let validDirections = ['n', 'north', 'e', 'east', 's', 'south', 'w', 'west'];

        if (validDirections.includes(moveDirection.toLowerCase())) {
            this.moveSubmitHandler(moveDirection[0]);
        } else {
            this.setState({errorMessage:'Error: Invalid move direction: ', moveDirection});
        }
    } else if (commandInput.match(sayCommandRegex)) {
        let sayText = commandInput.match(sayCommandRegex)[0];
        this.saySubmitHandler(sayText);
    } else {
      this.setState({errorMessage: 'Error: Something is wrong with your command input.'});
    }    
  }

  moveSubmitHandler = (direction) => {
    let data = {
      'direction': direction
    }
    let token = localStorage.getItem('key');
    let config = {
      headers: {
        Authorization: `Token ${token}`
      }
    }

    axios
      .post(`${host}/api/adv/move`, data, config)
      .then(res => {
        if (res.data['error_msg'] === 'You cannot move that way.') {
          this.updateRoomActivity('You can\'t move that way.');
        }
        else {
          this.setState({
            roomTitle: res.data.title,
            roomDescription: res.data.description,
            namesOfPlayersInRoom: res.data.players,
            roomActivity: []
          });
        }
      })
      .catch(err => {
        console.error('Axios failed: ', err.response);
      })
  }

  saySubmitHandler = (sayText) => {
    let data = {
      'sayText': sayText
    }
    let token = localStorage.getItem('key');
    let config = {
      headers: {
        Authorization: `Token ${token}`
      }
    }

    axios
      .post(`${host}/api/adv/say`, data, config)
      .then(res => {
        this.updateRoomActivity(data.sayText);
      })
      .catch(err => {
        console.error('Axios failed: ', err.response);
      })
  }

  render() {
    return(
      <AppContainerStyledDiv>

        {/* REGISTER COMPONENT */}
        <Route exact path = "/register" render = {() => (
          this.state.registered ? (
            <Redirect to ='/dashboard' />
          ) : (
            <Register 
              registerUsername = {this.state.registerUsername}
              registerPassword1 = {this.state.registerPassword1}
              registerPassword2 = {this.state.registerPassword2}
              inputChangeHandler = {this.inputChangeHandler}
              registerSubmitHandler = {this.registerSubmitHandler}
              errorMessage = {this.state.errorMessage}
            />
          )
        )}
        />

        {/* LOGIN COMPONENT (when exact path = "/")*/}
        <Route exact path = "/" render = {() => (
          this.state.loggedIn ? (
            <Redirect to ='/dashboard' />
          ) : (
            <Login 
                loginUsername = {this.state.loginUsername}
                loginPassword = {this.state.loginPassword}
                inputChangeHandler = {this.inputChangeHandler}
                loginSubmitHandler = {this.loginSubmitHandler}
                errorMessage = {this.state.errorMessage}
            />
          )
        )}
        />

        {/* LOGIN COMPONENT (when exact path = "/") */}
        <Route exact path = "/login" render = {() => (
          this.state.loggedIn ? (
            <Redirect to ='/dashboard' />
          ) : (
            <Login 
                loginUsername = {this.state.loginUsername}
                loginPassword = {this.state.loginPassword}
                inputChangeHandler = {this.inputChangeHandler}
                loginSubmitHandler = {this.loginSubmitHandler}
                errorMessage = {this.state.errorMessage}
            />
          )
        )}
        />

        {/* INITIALIZE COMPONENT */}
        <Route path = "/initialize" render = {() =>
          <Initialize 
            initializeSubmitHandler = {this.initializeSubmitHandler}
          />
        }
        />

        <Route path = "/dashboard" render = {() => (
          this.state.loggedIn ? (
            <Dashboard
              playerName = {this.state.playerName}
              playerUUID = {this.state.playerUUID}
              roomTitle = {this.state.roomTitle}
              roomDescription = {this.state.roomDescription}
              namesOfPlayersInRoom = {this.state.namesOfPlayersInRoom} 
              roomActivity = {this.state.roomActivity}
              commandInput = {this.state.commandInput}
              commandInputSubmitHandler = {this.commandInputSubmitHandler}
              inputChangeHandler = {this.inputChangeHandler}
              logoutSubmitHandler = {this.logoutSubmitHandler}
              toggleViewInstructions = {this.toggleViewInstructions}
              viewInstructions = {this.state.viewInstructions}
            />
          ) : (
            <Redirect to ='/' />
          )
        )}/>
      </AppContainerStyledDiv>
    )
  }
}


const PrivateRoute = ({component: Component, ...rest}) => { //...rest of the props passed to the component
  return (
    <Route {...rest} render = {(props) => (
      false === true
        ? <Component {...props} />  // props here are location, match, and history
        : <Redirect to = '/'/>
    )}/>
  )
}

const AppContainerStyledDiv = styled.div`
  
  width: 800px;
  margin-left:auto;
  margin-right:auto;
  margin-top: 10%;
`

export default App;








// // // // // -------------NOTES FROM PUSHER DOCUMENTATION-------------

// // // // Initialization of the pusher
// // // A connection to Pusher is established by providing your APP_KEY and 
// // // APP_CLUSTER to the constructor function. When you create a new Pusher
// // // object you are automatically connected to Channels.
// const socket = new Pusher('APP_KEY', {
//   cluster: 'APP_CLUSTER',
// });
// // // This ***returns a socket object*** which can then be used to subscribe 
// // // to channels.

// // // // SOCKET IDs
// // // Making a connection provides the client with a new socket_id that is 
// // // assigned by the server. This can be used to distinguish the client's own
// // // events. A change of state might otherwise be duplicated in the client. 
// // // More information on this pattern is available here 
// // // (http://pusherapp.com/docs/duplicates).

// // // It is also stored within the socket, and used as a token for generating 
// // // signatures for private channels.

// // // // // SUBSCRIBING TO CHANNELS
// // // // Public channels
// // // The default method for subscribing to a channel involves invoking the 
// // // subscribe method of your socket object:
// // const channel = socket.subscribe('my-channel');
// // // This returns a Channel object which events can be bound to.

// // // // Private channels
// // // Private channels are created in exactly the same way as normal channels, 
// // // except that they reside in the 'private-' namespace. This means 
// // // prefixing the channel name:
// // //        const channel = socket.subscribe('private-my-channel');

// const channel = socket.subscribe('presence-my-channel');
// const channel = socket.subscribe(`p-channel-${}`);

// // // // Unsubscribing from channels
// // // To unsubscribe from a channel, invoke the unsubscribe method of your 
// // // socket object:
// // //        socket.unsubscribe('my-channel');

// // // // // Binding to events
// // // Event binding takes a very similar form to the way events are handled in
// // // jQuery. You can use the following methods either on a ***channel object,
// // // to bind to events on a particular channel;*** or on the pusher object, 
// // // to bind to events on all subscribed channels simultaneously.

// // // // bind and unbind
// // // Every published event has an "event name". The name of the event below
// // // is 'new-message'. Binding to "new-message" on channel: The following 
// // // logs message data to the console when "new-message" is received:
// // channel.bind('new-message', function (data) {
// //   console.error(data.message);
// // });
// // // // I'll be using this other event here (from the quick-start page):
// // channel.bind('my-event', function(data) {
// //   alert('An event was triggered with message: ' + data.message);
// // });

// // // We can also provide the this value when calling a handler as a third 
// // // optional parameter. The following logs "hi Pusher" when "my-event" is 
// // // fired.
// // //            channel.bind('my-event', function () {
// // //              console.error(`hi ${this.name}`);
// // //            }, { name: 'Pusher' });
// // // Unsubscribe behaviour varies depending on which parameters you provide 
// // // it with. For example:
// // //            // Remove just `handler` for the `new-comment` event
// // //            channel.unbind('new-comment', handler);

// // // // bind_global and unbind_global (<--- skipping notes on this (for now))
// // // // unbind_all (<--- skipping notes on this (for now))


// // // // // Default events
// // // There are a number of events which are used internally, but can also be 
// // // of use elsewhere, for instance subscribe. There is also a state_change 
// // // event - which fires whenever there is a state change. You can use it 
// // // like this:
// //       // pusher.connection.bind('state_change', function(states) {
// //       //   // states = {previous: 'oldState', current: 'newState'}
// //       //   $('div#status').text("Channels current state is " + states.current);
// //       // });

// // // // // Connection Events
// // //To listen for when you connect to Pusher:
// //             // socket.connection.bind('connected', callback);
// // // And to bind to disconnections:
// //             // socket.connection.bind('disconnected', callback);
