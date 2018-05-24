import React, {Component, PropTypes} from 'react';
import HTML from '../../utils/html-helper';
import DateHelper from '../../utils/date-helper';
import App from '../../core';
import Lang from '../../lang';
import ContextMenu from '../../components/context-menu';
import Icon from '../../components/icon';
import MemberProfileDialog from '../common/member-profile-dialog';
import {UserAvatar} from '../common/user-avatar';
import {MessageDivider} from './message-divider';
import {MessageContentFile} from './message-content-file';
import {MessageContentImage} from './message-content-image';
import {MessageContentText} from './message-content-text';
import {MessageBroadcast} from './message-broadcast';
import {NotificationMessage} from './notification-message';
import replaceViews from '../replace-views';

const showTimeLabelInterval = 1000 * 60 * 5;

export default class MessageListItem extends Component {
    static propTypes = {
        message: PropTypes.object.isRequired,
        lastMessage: PropTypes.object,
        font: PropTypes.object,
        ignoreStatus: PropTypes.bool,
        showDateDivider: PropTypes.any,
        hideHeader: PropTypes.any,
        staticUI: PropTypes.bool,
        avatarSize: PropTypes.number,
        dateFormater: PropTypes.string,
        textContentConverter: PropTypes.func,
        className: PropTypes.string,
        children: PropTypes.any,
    };

    static defaultProps = {
        lastMessage: null,
        children: null,
        font: null,
        className: null,
        showDateDivider: 0,
        hideHeader: 0,
        staticUI: false,
        avatarSize: null,
        dateFormater: 'hh:mm',
        ignoreStatus: false,
        textContentConverter: null,
    };

    static get MessageListItem() {
        return replaceViews('chats/message-list-item', MessageListItem);
    }

    constructor(props) {
        super(props);
        this.state = {sharing: false};
        this.hasContextMenu = App.im.ui.hasMessageContextMenu(props.message);
    }

    componentDidMount() {
        if (!this.props.ignoreStatus) {
            this.checkResendMessage();
        }
        if (this.needGetSendInfo && this.needGetSendInfo !== true) {
            App.server.tryGetTempUserInfo(this.needGetSendInfo);
            this.needGetSendInfo = true;
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        return (
            this.state.sharing !== nextState.sharing ||
            this.props.message !== nextProps.message || nextProps.message.updateId !== this.lastMessageUpdateId ||
            this.props.lastMessage !== nextProps.lastMessage ||
            this.props.showDateDivider !== nextProps.showDateDivider ||
            this.props.hideHeader !== nextProps.hideHeader ||
            this.props.ignoreStatus !== nextProps.ignoreStatus ||
            this.props.font !== nextProps.font || (this.props.font && nextProps.font && this.lastFontSize !== nextProps.font.size) ||
            this.props.className !== nextProps.className ||
            this.props.dateFormater !== nextProps.dateFormater ||
            this.props.textContentConverter !== nextProps.textContentConverter ||
            this.props.avatarSize !== nextProps.avatarSize ||
            this.props.children !== nextProps.children ||
            (this.lastSenderUpdateId !== false && this.lastSenderUpdateId !== nextProps.message.getSender(App.members).updateId) ||
            this.props.staticUI !== nextProps.staticUI);
    }

    componentDidUpdate() {
        if (!this.props.ignoreStatus) {
            this.checkResendMessage();
        }
    }

    componentWillUnmount() {
        clearTimeout(this.checkResendTask);
    }

    handleSenderNameClick(sender, message) {
        App.im.ui.sendContentToChat(`@${sender.displayName} `);
    }

    handleUserContextMenu = e => {
        const {message} = this.props;
        const sender = message.getSender(App.members);
        const items = App.im.ui.createChatMemberContextMenuItems(sender, App.im.chats.get(message.cgid));
        ContextMenu.show({x: e.pageX, y: e.pageY}, items);
        e.preventDefault();
    }

    checkResendMessage() {
        const {message} = this.props;
        if (message.needCheckResend) {
            clearTimeout(this.checkResendTask);
            this.checkResendTask = setTimeout(() => {
                if (message.needResend) {
                    this.forceUpdate();
                }
            }, 10500);
        }
    }


    handleResendBtnClick = () => {
        const message = this.props.message;
        message.date = new Date().getTime();
        if (message.needCheckResend) {
            App.im.server.sendChatMessage(message);
        }
        this.forceUpdate();
    };

    handleDeleteBtnClick = () => {
        const message = this.props.message;
        if (message.needCheckResend) {
            App.im.chats.deleteLocalMessage(this.props.message);
        }
    };

    handleShareBtnClick = e => {
        if (this.hasContextMenu) {
            const pos = {x: e.pageX, y: e.pageY, direction: 'bottom-left'};
            const items = App.im.ui.createMessageContextMenu(this.props.message);
            if (items.length) {
                this.setState({sharing: true}, () => {
                    App.ui.showContextMenu(pos, items, {onHidden: () => {
                        this.setState({sharing: false});
                    }});
                });
            }
        }
    }

    render() {
        let {
            message,
            lastMessage,
            showDateDivider,
            hideHeader,
            ignoreStatus,
            font,
            className,
            dateFormater,
            textContentConverter,
            avatarSize,
            children,
            staticUI,
            ...other
        } = this.props;

        this.lastMessageUpdateId = message.updateId;
        this.lastFontSize = font && font.size;

        const basicFontStyle = font ? {
            fontSize: `${font.size}px`,
            lineHeight: font.lineHeight,
        } : null;
        if (showDateDivider === 0) {
            showDateDivider = !lastMessage || !DateHelper.isSameDay(message.date, lastMessage.date);
        }

        if (message.isBroadcast) {
            return (<div className={HTML.classes('app-message-item app-message-item-broadcast', className)} {...other}>
                {showDateDivider && <MessageDivider date={message.date} />}
                <MessageBroadcast contentConverter={textContentConverter} style={basicFontStyle} message={message} />
            </div>);
        }

        const needCheckResend = !ignoreStatus && message.needCheckResend;
        const needResend = !ignoreStatus && needCheckResend && message.needResend;
        const isNotification = message.isNotification;

        if (hideHeader === 0) {
            hideHeader = !showDateDivider && lastMessage && lastMessage.senderId === message.senderId && lastMessage.type === message.type;
        }

        let headerView = null;
        let timeLabelView = null;
        let contentView = null;
        let resendButtonsView = null;

        const titleFontStyle = font ? {
            fontSize: `${font.title}px`,
            lineHeight: font.titleLineHeight,
        } : null;

        if (!hideHeader) {
            const sender = message.getSender(App.members);
            this.lastSenderUpdateId = sender.updateId;
            if (sender.temp) {
                this.needGetSendInfo = sender.id;
            }
            headerView = (<div className="app-message-item-header">
                <UserAvatar size={avatarSize} className="state" user={sender} onContextMenu={this.handleUserContextMenu} onClick={isNotification ? null : MemberProfileDialog.show.bind(null, sender, null)} />
                <header style={titleFontStyle}>
                    {isNotification ? <span className="title text-primary">{sender.displayName}</span> : <a className="title rounded text-primary" onContextMenu={staticUI ? null : this.handleUserContextMenu} onClick={staticUI ? MemberProfileDialog.show.bind(null, sender, null) : this.handleSenderNameClick.bind(this, sender, message)}>{sender.displayName}</a>}
                    <small className="time">{DateHelper.formatDate(message.date, dateFormater)}</small>
                </header>
            </div>);
        } else {
            this.lastSenderUpdateId = false;
        }

        if (isNotification) {
            contentView = <NotificationMessage message={message} />;
        } else if (message.isFileContent) {
            contentView = <MessageContentFile message={message} />;
        } else if (message.isImageContent) {
            contentView = <MessageContentImage message={message} />;
        } else {
            contentView = <MessageContentText id={`message-content-${message.gid}`} contentConverter={textContentConverter} fontSize={this.lastFontSize} style={basicFontStyle} message={message} />;
        }

        if (!headerView) {
            let hideTimeLabel = false;
            if (hideHeader && !showDateDivider && lastMessage && message.date && (message.date - lastMessage.date) <= showTimeLabelInterval) {
                hideTimeLabel = true;
            }
            timeLabelView = <span className={HTML.classes('app-message-item-time-label', {'as-dot': hideTimeLabel})}>{DateHelper.formatDate(message.date, 'hh:mm')}</span>;
        }

        if (!staticUI && !ignoreStatus && needResend) {
            resendButtonsView = (<nav className="nav nav-sm app-message-item-actions">
                <a onClick={this.handleResendBtnClick}><Icon name="refresh" /> {Lang.string('chat.message.resend')}</a>
                <a onClick={this.handleDeleteBtnClick}><Icon name="delete" /> {Lang.string('common.delete')}</a>
            </nav>);
        }

        let actionsView = null;
        if (this.hasContextMenu) {
            actionsView = (<div className="app-message-actions">
                <div className="hint--top-left" data-hint={Lang.string('common.shareMenu')}><button className="btn btn-sm iconbutton rounded" type="button" onClick={this.handleShareBtnClick}><Icon name="share" /></button></div>
            </div>);
        }

        return (<div
            onMouseEnter={this.hasContextMenu ? this.handleMouseEnter : null}
            onMouseLeave={this.hasContextMenu ? this.handleMouseLeave : null}
            {...other}
            className={HTML.classes('app-message-item', className, {
                'app-message-sending': !ignoreStatus && needCheckResend && !needResend,
                'app-message-send-fail': !ignoreStatus && needResend,
                'with-avatar': !hideHeader,
                sharing: this.state.sharing
            })}
        >
            {showDateDivider && <MessageDivider date={message.date} />}
            {headerView}
            {timeLabelView}
            {actionsView}
            {contentView && <div className="app-message-content">{contentView}</div>}
            {resendButtonsView}
        </div>);
    }
}
